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
import { getWeaveDashboardSensors, getHuntCumulativeSensors, getTnlCumulativeSensors } from "@/lib/sensor-config"
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
      "Weave Studio": "weave",
      "TNL": "tnl"
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

  console.log(`🔍 Generating baseline forecast for ${baseline.siteId}:`)
  console.log(`   Regression type: ${baseline.regression.type}`)
  console.log(`   Slope: ${baseline.regression.slope}`)
  console.log(`   Intercept: ${baseline.regression.intercept}`)
  console.log(`   Energy key: ${baseline.energyKey}`)
  console.log(`   Temp key: ${baseline.tempKey}`)

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
    const baselineValues = timestamps.map((timestamp, idx) => {
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

      // Determine if we need to multiply by 24 based on energy key type
      // Cumulative sensors (cctp) predict daily kWh directly
      // Instant power sensors (weave, cttp) predict hourly kW and need × 24 for daily kWh
      const energyKey = Array.isArray(baseline.energyKey) ? baseline.energyKey[0] : baseline.energyKey
      const isInstantPower = energyKey && (energyKey.includes('_weave') || energyKey.includes('_cttp'))

      const baselineEnergyBeforeMultiply = baselineEnergy
      if (isInstantPower) {
        baselineEnergy *= 24 // Convert hourly kW to daily kWh for instant power sensors
      }

      if (idx === 0) {
        console.log(`   First baseline calculation:`)
        console.log(`     Temperature: ${temperature.toFixed(2)}°C`)
        console.log(`     Energy key: ${energyKey} (${isInstantPower ? 'instant power' : 'cumulative energy'})`)
        if (isInstantPower) {
          console.log(`     Baseline (hourly kW): ${baselineEnergyBeforeMultiply.toFixed(2)} kW`)
          console.log(`     Baseline (daily kWh, ×24): ${baselineEnergy.toFixed(2)} kWh`)
        } else {
          console.log(`     Baseline (daily kWh): ${baselineEnergy.toFixed(2)} kWh`)
        }
      }

      return Math.max(0, baselineEnergy) // Ensure non-negative
    })

    console.log(`✅ Generated baseline forecast with ${baselineValues.length} points using ${baseline.regression.type} regression`)
    if (baselineValues.length > 0) {
      console.log(`   First baseline value: ${baselineValues[0].toFixed(2)} kWh`)
      console.log(`   Last baseline value: ${baselineValues[baselineValues.length - 1].toFixed(2)} kWh`)
    }
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

    console.log("🔧 Fetching fresh Hunt sensor data...")

    // Get TSDB configuration for multipliers and units
    const tsdbConfig = await fetchTsdbConfig()

    // The Hunt's cumulative sensors
    const huntCumulativeSensors = getHuntCumulativeSensors()
    console.log(`📊 Hunt sensors to fetch: ${huntCumulativeSensors.length} sensors (${huntCumulativeSensors.join(', ')})`)
    
    const now = Math.floor(Date.now() / 1000)
    const ninetyDaysAgo = now - (90 * 24 * 3600) // 90 days in seconds
    
    // Fetch data for all cumulative sensors
    const sensorPromises = huntCumulativeSensors.map(async (sensorKey) => {
      const payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: ninetyDaysAgo,
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
      
      // Handle both nested and flat response formats
      let dataPoints = []
      if (result.success) {
        if (result.data.success && result.data.data) {
          // Nested format: {success: true, data: {success: true, data: [...]}}
          dataPoints = result.data.data
        } else if (Array.isArray(result.data)) {
          // Flat format: {success: true, data: [...]}
          dataPoints = result.data
        }
      }
      
      return {
        key: sensorKey,
        data: dataPoints
      }
    })

    const sensorResults = await Promise.all(sensorPromises)
    
    // Create a time-indexed map to sum values across sensors
    const timeValueMap = new Map<number, number>()
    
    sensorResults.forEach(({ key, data }) => {
      const keyConfig = getKeyConfig(key, tsdbConfig)
      console.log(`🔧 Processing Hunt sensor ${key}: ${data.length} data points, config: multiplier=${keyConfig.multiplier}, offset=${keyConfig.offset}`)

      data.forEach((point: any, idx: number) => {
        // Normalize timestamp to start of day FIRST
        const dateOfTs = new Date(point.timestamp * 1000).toISOString().split("T")[0]
        const tsOfDate = new Date(dateOfTs).getTime() / 1000

        // Apply multiplier and offset from TSDB config
        const processedValue = point.value * keyConfig.multiplier + keyConfig.offset

        // Get existing value using the NORMALIZED timestamp
        const existingValue = timeValueMap.get(tsOfDate) || 0

        // Sum values from all 5 sensors for the same day
        const newValue = existingValue + processedValue
        timeValueMap.set(tsOfDate, newValue)

        if (idx === 0) {
          console.log(`   First point: date=${dateOfTs}, sensor_value=${point.value}, processed=${processedValue.toFixed(2)}, existing=${existingValue.toFixed(2)}, new_sum=${newValue.toFixed(2)}`)
        }
      })
    })
    
    // Convert back to array format and sort by timestamp
    let aggregatedData = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    console.log(`📊 Hunt aggregated data summary:`)
    console.log(`   Total data points after aggregation: ${aggregatedData.length}`)
    if (aggregatedData.length > 0) {
      console.log(`   First aggregated point: date=${new Date(aggregatedData[0].timestamp * 1000).toISOString()}, value=${aggregatedData[0].value.toFixed(2)}`)
      console.log(`   Last aggregated point: date=${new Date(aggregatedData[aggregatedData.length - 1].timestamp * 1000).toISOString()}, value=${aggregatedData[aggregatedData.length - 1].value.toFixed(2)}`)
    }

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

    console.log("🔧 Fetching fresh Weave Studio sensor data...")
    
    // Get TSDB configuration for multipliers and units
    const tsdbConfig = await fetchTsdbConfig()
    
    // Weave Studio's instant energy sensors
    const weaveSensors = getWeaveDashboardSensors()
    
    const now = Math.floor(Date.now() / 1000)
    const ninetyDaysAgo = now - (90 * 24 * 3600) // 90 days in seconds
    
    // Fetch data for each sensor
    const sensorPromises = weaveSensors.map(async (sensorKey) => {
      let payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: ninetyDaysAgo,
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
      
      // Handle both nested and flat response formats
      let dataPoints = []
      if (result.success) {
        if (result.data.success && result.data.data) {
          // Nested format: {success: true, data: {success: true, data: [...]}}
          dataPoints = result.data.data
        } else if (Array.isArray(result.data)) {
          // Flat format: {success: true, data: [...]}
          dataPoints = result.data
        }
      }
      
      if (dataPoints.length > 0) {

        const isCTTP = true;

        const _result = dataPoints.map((point: any) => {
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

interface TnlSensorData {
  timestamp: number
  value: number
}

async function fetchTnlSensorData(): Promise<TnlSensorData[]> {
  try {
    // Check Redis cache first (30 minutes TTL)
    const cacheKey = "tnl_sensor_data"

    console.log("🔧 Fetching fresh TNL sensor data...")

    // Get TSDB configuration for multipliers and units
    const tsdbConfig = await fetchTsdbConfig()

    // TNL's cumulative sensors
    const tnlCumulativeSensors = getTnlCumulativeSensors()
    console.log(`📊 TNL sensors to fetch: ${tnlCumulativeSensors.join(', ')}`)

    const now = Math.floor(Date.now() / 1000)
    const ninetyDaysAgo = now - (90 * 24 * 3600) // 90 days in seconds
    console.log(`⏰ Fetching TNL data from ${new Date(ninetyDaysAgo * 1000).toISOString()} to ${new Date(now * 1000).toISOString()}`)

    // Fetch data for all cumulative sensors
    const sensorPromises = tnlCumulativeSensors.map(async (sensorKey) => {
      const payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: ninetyDaysAgo,
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
        console.warn(`❌ Failed to fetch data for TNL sensor ${sensorKey}: ${response.status} ${response.statusText}`)
        return { key: sensorKey, data: [] }
      }

      const result = await response.json()

      // Handle both nested and flat response formats
      let dataPoints = []
      if (result.success) {
        if (result.data.success && result.data.data) {
          // Nested format: {success: true, data: {success: true, data: [...]}}
          dataPoints = result.data.data
        } else if (Array.isArray(result.data)) {
          // Flat format: {success: true, data: [...]}
          dataPoints = result.data
        }
      }

      console.log(`📈 TNL sensor ${sensorKey}: fetched ${dataPoints.length} raw data points`)
      if (dataPoints.length > 0) {
        console.log(`   First point: timestamp=${dataPoints[0].timestamp}, value=${dataPoints[0].value}`)
        console.log(`   Last point: timestamp=${dataPoints[dataPoints.length - 1].timestamp}, value=${dataPoints[dataPoints.length - 1].value}`)
      }

      return {
        key: sensorKey,
        data: dataPoints
      }
    })

    const sensorResults = await Promise.all(sensorPromises)

    // Create a time-indexed map to sum values across sensors
    const timeValueMap = new Map<number, number>()

    sensorResults.forEach(({ key, data }) => {
      const keyConfig = getKeyConfig(key, tsdbConfig)
      console.log(`🔧 Processing TNL sensor ${key} with config: multiplier=${keyConfig.multiplier}, offset=${keyConfig.offset}, unit=${keyConfig.unit}`)

      data.forEach((point: any, idx: number) => {
        // Normalize timestamp to start of day FIRST
        const dateOfTs = new Date(point.timestamp * 1000).toISOString().split("T")[0]
        const tsOfDate = new Date(dateOfTs).getTime() / 1000

        // Apply multiplier and offset from TSDB config
        const processedValue = point.value * keyConfig.multiplier + keyConfig.offset

        // Get existing value using the NORMALIZED timestamp
        const existingValue = timeValueMap.get(tsOfDate) || 0

        // Sum values from both sensors for the same day
        const newValue = existingValue + processedValue
        timeValueMap.set(tsOfDate, newValue)

        if (idx < 3) {
          console.log(`   Point ${idx}: date=${dateOfTs}, sensor_value=${point.value}, processed=${processedValue.toFixed(2)}, existing=${existingValue.toFixed(2)}, new_sum=${newValue.toFixed(2)}`)
        }
      })
    })

    // Convert back to array format and sort by timestamp
    let aggregatedData = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    console.log(`📊 TNL aggregated data summary:`)
    console.log(`   Total data points after aggregation: ${aggregatedData.length}`)
    if (aggregatedData.length > 0) {
      console.log(`   First aggregated point: date=${new Date(aggregatedData[0].timestamp * 1000).toISOString()}, value=${aggregatedData[0].value}`)
      console.log(`   Last aggregated point: date=${new Date(aggregatedData[aggregatedData.length - 1].timestamp * 1000).toISOString()}, value=${aggregatedData[aggregatedData.length - 1].value}`)
    }

    // Cache the processed data for 30 minutes (1800 seconds)
    await redis.set(cacheKey, JSON.stringify(aggregatedData), 1800)

    console.log(`✅ Fetched and cached data for ${tnlCumulativeSensors.length} TNL sensors, ${aggregatedData.length} data points`)
    return aggregatedData

  } catch (error) {
    console.error("Error fetching TNL sensor data:", error)
    return []
  }
}

async function calculateEnergyMetrics(
  sensorData: HuntSensorData[] | WeaveSensorData[] | TnlSensorData[],
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
    baselineForecast = actualUsage.map(usage => usage * 1.15)
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
      // Pass the location name from Redis to override the Weather API's location name
      weatherData = processWeatherData(currentWeatherData, userLocation.name)
    } else {
      console.log("❌ Failed to fetch weather data, using dummy data")
      weatherData = getDummyWeatherData()
    }

    // Determine energy data based on user
    let energyUsageData
    let energySavingsData

    if (user.name === "The Hunt" || user.name === "Weave Studio" || user.name === "TNL") {
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
        : user.name === "TNL"
        ? await fetchTnlSensorData()
        : await fetchWeaveSensorData()

      console.log(`📊 ${user.name} sensor data fetched: ${sensorData.length} total data points`)
      if (sensorData.length > 0) {
        console.log(`   Sample data point: timestamp=${sensorData[0].timestamp}, value=${sensorData[0].value}`)
      }

      // Calculate energy metrics with baseline
      const metrics = await calculateEnergyMetrics(sensorData, config, baseline, tsdbConfig)

      console.log(`📈 ${user.name} metrics calculated:`)
      console.log(`   Actual usage points: ${metrics.actualUsage.length}`)
      console.log(`   Baseline forecast points: ${metrics.baselineForecast.length}`)
      console.log(`   Latest cumulative: ${metrics.latestCumulative}`)

      // Generate date labels for the last 90 days
      const dateLabels = sensorData.map(point => {
        const date = new Date(point.timestamp * 1000)
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
      })

      // For The Hunt, filter out data points where actual usage > 300kWh
      let filteredLabels = dateLabels
      let filteredActualUsage = metrics.actualUsage
      let filteredBaselineForecast = metrics.baselineForecast

      if (user.name === "The Hunt") {
        const validIndices = metrics.actualUsage
          .map((value, index) => (value !== null && value <= 300) ? index : -1)
          .filter(index => index !== -1)

        filteredLabels = validIndices.map(i => dateLabels[i])
        filteredActualUsage = validIndices.map(i => metrics.actualUsage[i])
        filteredBaselineForecast = validIndices.map(i => metrics.baselineForecast[i])

        console.log(`🔧 The Hunt data filtering: ${metrics.actualUsage.length} points -> ${filteredActualUsage.length} points (removed ${metrics.actualUsage.length - filteredActualUsage.length} points > 300kWh)`)
      }

      energyUsageData = {
        labels: filteredLabels.length > 0 ? filteredLabels : ["No Data"],
        actualUsage: filteredActualUsage, // Always use processed sum (all five sensors for The Hunt)
        energyForecast: [], // Empty for real data users
        baselineForecast: filteredBaselineForecast, // Always uses manual model if present
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
      console.log(`📤 Sending to frontend:`)
      console.log(`   Labels: ${energyUsageData.labels.length} labels`)
      console.log(`   Actual usage: ${energyUsageData.actualUsage.length} data points`)
      console.log(`   Baseline forecast: ${energyUsageData.baselineForecast.length} data points`)
      if (energyUsageData.actualUsage.length > 0) {
        console.log(`   First actual value: ${energyUsageData.actualUsage[0]}`)
        console.log(`   Last actual value: ${energyUsageData.actualUsage[energyUsageData.actualUsage.length - 1]}`)
      }
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
