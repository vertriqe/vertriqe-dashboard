import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { redis } from "@/lib/redis"
import {
  fetchWeatherData,
  processWeatherData,
  getDummyWeatherData,
  type WeatherLocation,
} from "@/lib/weather-service"
import { getWeaveDashboardSensors, getHuntCumulativeSensors } from "@/lib/sensor-config"
import { fetchTsdbConfig, getKeyConfig } from "@/lib/tsdb-config"
import { getTsdbUrl, API_CONFIG } from "@/lib/api-config"

interface EnergyConfig {
  savingsPercentage: number
  co2ReductionFactor: number
  costPerKwh: number
}

interface HuntSensorData {
  timestamp: number
  value: number
}

interface WeaveSensorData {
  timestamp: number
  value: number
}

async function getEnergyConfig(): Promise<EnergyConfig> {
  try {
    const configData = await redis.get("energy_config")
    if (configData) {
      return JSON.parse(configData as string)
    }
  } catch (error) {
    console.warn("Failed to get energy config from Redis:", error)
  }

  // Return default config
  return {
    savingsPercentage: 0,
    co2ReductionFactor: 11,
    costPerKwh: 1.317
  }
}

async function getBaselineForUser(userName: string): Promise<any> {
  try {
    // Map user names to site IDs
    const siteMapping: Record<string, string> = {
      "The Hunt": "hunt",
      "Weave Studio": "weave"
    }

    const siteId = siteMapping[userName]
    if (!siteId) {
      console.log(`No baseline mapping for user: ${userName}`)
      return null
    }

    const baselineData = await redis.get(`baseline:${siteId}`)
    if (baselineData) {
      const baseline = JSON.parse(baselineData as string)
      console.log(`✅ Found baseline for ${userName}: ${baseline.regression.type}`)
      return baseline
    }

    console.log(`No baseline found for user: ${userName}`)
    return null
  } catch (error) {
    console.error("Error fetching baseline:", error)
    return null
  }
}

async function generateBaselineForecast(
  timestamps: number[],
  baseline: any,
  tsdbConfig: any
): Promise<number[]> {
  if (!baseline || !timestamps.length) {
    return []
  }

  try {
    // Get temperature data for the same time range
    const tempKey = baseline.tempKey || "weather_thehunt_temp_c"
    const startTime = timestamps[0]
    const endTime = timestamps[timestamps.length - 1]

    const tempResponse = await fetch(getTsdbUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        operation: "read",
        key: tempKey,
        Read: {
          start_timestamp: startTime,
          end_timestamp: endTime,
          downsampling: 86400, // Daily
          aggregation: "avg"
        }
      })
    })

    if (!tempResponse.ok) {
      console.warn("Failed to fetch temperature data for baseline")
      return []
    }

    const tempData = await tempResponse.json()
    if (!tempData.success || !tempData.data.success) {
      console.warn("No temperature data available for baseline")
      return []
    }

    const tempConfig = getKeyConfig(tempKey, tsdbConfig)
    const tempPoints = tempData.data.data

    // Generate baseline values using the regression equation
    const baselineValues = timestamps.map(timestamp => {
      // Find corresponding temperature
      const tempPoint = tempPoints.find((tp: any) =>
        Math.abs(tp.timestamp - timestamp) <= 1800 // 30 min tolerance
      )

      if (!tempPoint) return 0

      // Apply temperature multiplier and offset
      const temperature = tempPoint.value * tempConfig.multiplier + tempConfig.offset

      // Calculate baseline energy using the regression
      const regression = baseline.regression
      let baselineEnergy = 0

      if (regression.type === 'linear') {
        baselineEnergy = regression.slope * temperature + regression.intercept
      } else if (regression.type === 'quadratic' && regression.coefficients) {
        const { a, b, c } = regression.coefficients
        baselineEnergy = (a || 0) * temperature * temperature + (b || 0) * temperature + (c || 0)
      } else if (regression.type === 'logarithmic' && temperature > 0) {
        baselineEnergy = regression.slope * Math.log(temperature) + regression.intercept
      }

      baselineEnergy *= 24 // Convert to daily energy

      return Math.max(0, baselineEnergy) // Ensure non-negative
    })

    console.log(`✅ Generated baseline forecast with ${baselineValues.length} points using ${baseline.regression.type} regression`)
    return baselineValues

  } catch (error) {
    console.error("Error generating baseline forecast:", error)
    return []
  }
}

async function fetchHuntSensorData(): Promise<HuntSensorData[]> {
  try {
    // Check Redis cache first (30 minutes TTL)
    const cacheKey = "hunt_sensor_data"
    const cachedData = await redis.get(cacheKey)

    console.log("🔧 Fetching fresh Hunt sensor data...")
    
    // Get TSDB configuration for multipliers and units
    const tsdbConfig = await fetchTsdbConfig()
    
    // The Hunt's cumulative sensors
    const huntCumulativeSensors = getHuntCumulativeSensors()
    
    const now = Math.floor(Date.now() / 1000)
    const thirtyDaysAgo = now - (30 * 24 * 3600) // 30 days in seconds
    
    // Fetch data for all cumulative sensors
    const sensorPromises = huntCumulativeSensors.map(async (sensorKey) => {
      const payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: thirtyDaysAgo,
          end_timestamp: now,
          downsampling: 86400, // Daily aggregation
          aggregation: "max" // Use max to get daily peak values
        }
      }

      const response = await fetch(API_CONFIG.TSDB.BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-url": "http://35.221.150.154:5556"
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.warn(`Failed to fetch data for sensor ${sensorKey}`)
        return { key: sensorKey, data: [] }
      }

      const result = await response.json()
      return {
        key: sensorKey,
        data: result.success && result.data.success ? result.data.data : []
      }
    })

    const sensorResults = await Promise.all(sensorPromises)
    
    // Create a time-indexed map to sum values across sensors
    const timeValueMap = new Map<number, number>()
    
    sensorResults.forEach(({ key, data }) => {
      const keyConfig = getKeyConfig(key, tsdbConfig)
      
      data.forEach((point: any) => {
        // Apply multiplier and offset from TSDB config
        const processedValue = point.value * keyConfig.multiplier + keyConfig.offset
        const existingValue = timeValueMap.get(point.timestamp) || 0
        const dateOfTs = new Date(point.timestamp * 1000).toISOString().split("T")[0]
        const tsOfDate = new Date(dateOfTs).getTime() / 1000
        timeValueMap.set(tsOfDate, existingValue + processedValue)
      })
    })
    
    // Convert back to array format and sort by timestamp
    let aggregatedData = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // deduplicate data points that with the same date, for the same date, use the max value
    // for (let i = aggregatedData.length - 1; i > 0; i--) {
    //   if (aggregatedData[i].timestamp === aggregatedData[i - 1].timestamp) {
    //     aggregatedData[i - 1].value = Math.max(aggregatedData[i - 1].value, aggregatedData[i].value)
    //     aggregatedData.splice(i, 1)
    //     console.log(`Deduplicated data point at timestamp ${aggregatedData[i].timestamp}`) // Log deduplication
    //   }
    // }
    //console.log(aggregatedData)

    // Cache the processed data for 30 minutes (1800 seconds)
    await redis.set(cacheKey, JSON.stringify(aggregatedData), 1800)
    
    console.log(`✅ Fetched and cached data for ${huntCumulativeSensors.length} sensors, ${aggregatedData.length} data points`)
    return aggregatedData
    
  } catch (error) {
    console.error("Error fetching Hunt sensor data:", error)
    return []
  }
}

async function fetchWeaveSensorData(): Promise<WeaveSensorData[]> {
  try {
    // Check Redis cache first (30 minutes TTL)
    const cacheKey = "weave_sensor_data"
    const cachedData = await redis.get(cacheKey)

    console.log("🔧 Fetching fresh Weave Studio sensor data...")
    
    // Get TSDB configuration for multipliers and units
    const tsdbConfig = await fetchTsdbConfig()
    
    // Weave Studio's instant energy sensors
    const weaveSensors = getWeaveDashboardSensors()
    
    const now = Math.floor(Date.now() / 1000)
    const thirtyDaysAgo = now - (30 * 24 * 3600) // 30 days in seconds
    
    // Fetch data for each sensor
    const sensorPromises = weaveSensors.map(async (sensorKey) => {
      let payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: thirtyDaysAgo,
          end_timestamp: now,
          downsampling: 86400, // Daily aggregation
          aggregation: "avg"    // Sum for energy consumption
        }
      }



      const response = await fetch(getTsdbUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.warn(`Failed to fetch data for Weave Studio sensor ${sensorKey}`)
        return []
      }

      const result = await response.json()
      if (result.success && result.data.success && result.data.data.length > 0) {
        const _result= result.data.data.map((point: any) => {
          const config = getKeyConfig(sensorKey, tsdbConfig)
          return {
            timestamp: point.timestamp,
            value: (point.value * config.multiplier + config.offset) * 24, // Apply multiplier and offset
            key: sensorKey // For debugging purposes
          }
        })
        
        return _result
      }
      
      return []
    })

    const allSensorResults = await Promise.all(sensorPromises)
    
    // Combine all sensor data and aggregate by normalized daily timestamp
    const timeValueMap = new Map<number, number>()
    
    allSensorResults.flat().forEach((point: any) => {
      // Normalize timestamp to daily timestamp (start of day)
      const dateOfTs = new Date(point.timestamp * 1000).toISOString().split("T")[0]
      const normalizedTimestamp = new Date(dateOfTs).getTime() / 1000
      
      const existingValue = timeValueMap.get(normalizedTimestamp) || 0
      timeValueMap.set(normalizedTimestamp, existingValue + point.value)
    })
    
    // Convert to final format
    const aggregatedData: WeaveSensorData[] = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // Cache for 30 minutes
    await redis.set(cacheKey, JSON.stringify(aggregatedData), 30 * 60)
    
    return aggregatedData
  } catch (error) {
    console.error("Error fetching Weave Studio sensor data:", error)
    return []
  }
}

async function calculateEnergyMetrics(
  sensorData: HuntSensorData[] | WeaveSensorData[],
  _config: EnergyConfig,
  baseline: any = null,
  tsdbConfig: any = null
) {
  if (sensorData.length === 0) {
    return {
      actualUsage: [],
      energyForecast: [],
      baselineForecast: [],
      latestCumulative: 0,
      energySaved: 0,
      co2Reduced: 0,
      totalSaving: 0
    }
  }

  // Get the latest cumulative value (most recent data point)
  const latestCumulative = sensorData[sensorData.length - 1]?.value || 0

  // Calculate savings based on the latest cumulative sum
  const energySaved = 0;// latestCumulative * (config.savingsPercentage / 100)
  const co2Reduced = 0;// energySaved * config.co2ReductionFactor
  const totalSaving = 0;// energySaved * config.costPerKwh

  // Extract actual usage values
  const actualUsage = sensorData.map(point => point.value)

  // Energy forecast stays the same (dummy data for now)
  const energyForecast = [2200, 2400, 2300, 2500, 2800, 3500, 3400, 3200, 3000, 2800, 2200, 2300]

  // Generate baseline forecast from stored regression if available
  let baselineForecast: number[] = []
  if (baseline && tsdbConfig) {
    const timestamps = sensorData.map(point => point.timestamp)
    baselineForecast = await generateBaselineForecast(timestamps, baseline, tsdbConfig)
  }

  // Fallback to default calculation if no baseline available
  if (baselineForecast.length === 0) {
    baselineForecast = actualUsage.map(usage => usage * 1.255)
  }

  return {
    actualUsage,
    energyForecast,
    baselineForecast,
    latestCumulative,
    energySaved,
    co2Reduced,
    totalSaving
  }
}

async function getUserFromToken(): Promise<{ email: string; name: string } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      console.log("❌ No auth token found")
      return null
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const { payload } = await jwtVerify(token, secret)

    console.log(`✅ User authenticated: ${payload.name} (${payload.email})`)
    return { 
      email: payload.email as string,
      name: payload.name as string
    }
  } catch (error) {
    console.error("❌ Error getting user from token:", error)
    return null
  }
}

async function getUserLocation(email: string): Promise<WeatherLocation> {
  try {
    console.log(`🔍 Looking up location for user: ${email}`)

    // Try to get user-specific location
    const userLocationData = await redis.get(`user_location:${email}`)

    if (userLocationData) {
      const location = JSON.parse(userLocationData as string)
      console.log(`✅ Found user-specific location: ${location.name} (${location.lat}, ${location.lon})`)
      return location
    }

    // Fall back to default location
    const defaultLocationData = await redis.get("user_location:default")

    if (defaultLocationData) {
      const location = JSON.parse(defaultLocationData as string)
      console.log(`✅ Using default location: ${location.name} (${location.lat}, ${location.lon})`)
      return location
    }

    // Ultimate fallback
    const fallbackLocation = {
      name: "thehunt",
      lat: "22.3089214",
      lon: "114.2241502",
    }
    console.log(`⚠️ Using hardcoded fallback location: ${fallbackLocation.name}`)
    return fallbackLocation
  } catch (error) {
    console.error("❌ Error getting user location:", error)
    return {
      name: "thehunt",
      lat: "22.3089214",
      lon: "114.2241502",
    }
  }
}

export async function GET() {
  console.log("🚀 Dashboard API called")

  // Simulate database fetch delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  try {
    // Get user from JWT token
    const user = await getUserFromToken()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get user's location
    const userLocation = await getUserLocation(user.email)

    // Fetch real weather data
    console.log("🌤️ Starting weather data fetch...")

    const currentWeatherData = await fetchWeatherData(userLocation.lat, userLocation.lon)

    let weatherData
    if (currentWeatherData) {
      weatherData = processWeatherData(currentWeatherData)
    } else {
      console.log("❌ Failed to fetch weather data, using dummy data")
      weatherData = getDummyWeatherData()
    }

    // Determine energy data based on user
    let energyUsageData
    let energySavingsData

    if (user.name === "The Hunt" || user.name === "Weave Studio") {
      console.log(`🔧 Fetching real energy data for ${user.name}...`)

      // Get energy configuration
      const config = await getEnergyConfig()

      // Get TSDB configuration for baseline calculations
      const tsdbConfig = await fetchTsdbConfig()

      // Get baseline data for this user
      const baseline = await getBaselineForUser(user.name)

      // Fetch sensor data based on user
      const sensorData = user.name === "The Hunt"
        ? await fetchHuntSensorData()
        : await fetchWeaveSensorData()

      // Calculate energy metrics with baseline
      const metrics = await calculateEnergyMetrics(sensorData, config, baseline, tsdbConfig)

      // Generate date labels for the last 30 days
      const dateLabels = sensorData.map(point => {
        const date = new Date(point.timestamp * 1000)
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
      })

      energyUsageData = {
        labels: dateLabels.length > 0 ? dateLabels : ["No Data"],
        actualUsage: sensorData.map(point => point.value), // Cumulative readings per day
        energyForecast: [], // Empty for real data users
        baselineForecast: metrics.baselineForecast, // Generated from regression
      }

      energySavingsData = {
        percentage: `${config.savingsPercentage}%`,
        totalSaving: `${metrics.totalSaving.toFixed(1)}HKD`,
        co2Reduced: `${metrics.co2Reduced.toFixed(1)}kg`,
        energySaved: `${metrics.energySaved.toFixed(1)}kWh`,
        calculationInfo: {
          savingsPercentage: config.savingsPercentage,
          co2Factor: config.co2ReductionFactor,
          costPerKwh: config.costPerKwh,
          latestCumulative: metrics.latestCumulative
        }
      }

      console.log(`✅ Using real energy data for ${user.name} with ${baseline ? baseline.regression.type : 'default'} baseline`)
    } else {
      // Use empty/minimal data for other users
      energyUsageData = {
        labels: ["No Data Available"],
        actualUsage: [0],
        energyForecast: [0],
        baselineForecast: [0],
      }
      
      energySavingsData = {
        percentage: "0%",
        totalSaving: "0HKD",
        co2Reduced: "0kg",
        energySaved: "0kWh",
      }
      
    }

    const dashboardData = {
      ...weatherData,
      energyUsage: energyUsageData,
      energySavings: energySavingsData,
      userName: user.name
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("❌ Dashboard API error:", error)

    // Return minimal data on error
    const fallbackData = {
      ...getDummyWeatherData(),
      energyUsage: {
        labels: ["No Data Available"],
        actualUsage: [0],
        energyForecast: [0],
        baselineForecast: [0],
      },
      energySavings: {
        percentage: "0%",
        totalSaving: "0HKD",
        co2Reduced: "0kg",
        energySaved: "0kWh",
      },
    }

    console.log("⚠️ Returning minimal data due to error")
    return NextResponse.json(fallbackData)
  }
}
