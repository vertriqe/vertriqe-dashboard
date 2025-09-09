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

async function fetchTsdbConfig() {
  try {
    // Check Redis cache first
    const cachedConfig = await redis.get("tsdb_config")
    if (cachedConfig) {
      console.log("✅ Using cached TSDB config")
      return JSON.parse(cachedConfig as string)
    }

    console.log("🔧 Fetching TSDB config from API...")
    const response = await fetch("https://gtsdb-admin.vercel.app/api/tsdb?apiUrl=http%3A%2F%2F35.221.150.154%3A5556", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ operation: "getapiurlconfig" })
    })

    if (!response.ok) {
      throw new Error("Failed to fetch TSDB config")
    }

    const config = await response.json()
    
    // Cache for 1 hour
    await redis.set("tsdb_config", JSON.stringify(config), 3600)
    
    console.log("✅ TSDB config fetched and cached")
    return config
  } catch (error) {
    console.error("Error fetching TSDB config:", error)
    return null
  }
}

function getKeyConfig(key: string, tsdbConfig: any) {
  if (!tsdbConfig || !tsdbConfig.success) return { multiplier: 1, unit: "A", offset: 0 }

  // Find matching pattern in config
  for (const pattern in tsdbConfig.data.multipliers) {
    const regex = new RegExp(pattern.replace('*', '.*'))
    if (regex.test(key)) {
      return {
        multiplier: tsdbConfig.data.multipliers[pattern] || 1,
        unit: tsdbConfig.data.units[pattern] || "A",
        offset: tsdbConfig.data.offsets[pattern] || 0
      }
    }
  }
  return { multiplier: 1, unit: "A", offset: 0 }
}

async function fetchHuntSensorData(): Promise<HuntSensorData[]> {
  try {
    // Check Redis cache first (30 minutes TTL)
    const cacheKey = "hunt_sensor_data"
    const cachedData = await redis.get(cacheKey)
    if (false) {
      console.log("✅ Using cached Hunt sensor data")
      return JSON.parse(cachedData as string)
    }

    console.log("🔧 Fetching fresh Hunt sensor data...")
    
    // Get TSDB configuration for multipliers and units
    const tsdbConfig = await fetchTsdbConfig()
    
    // The Hunt's cumulative sensors
    const huntCumulativeSensors = [
      "vertriqe_25120_cctp",
      "vertriqe_25121_cctp", 
      "vertriqe_25122_cctp",
      "vertriqe_25123_cctp",
      "vertriqe_25124_cctp"
    ]
    
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

      const response = await fetch("https://gtsdb-admin.vercel.app/api/tsdb", {
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
    if (false) {
      console.log("✅ Using cached Weave Studio sensor data")
      return JSON.parse(cachedData as string)
    }

    console.log("🔧 Fetching fresh Weave Studio sensor data...")
    
    // Get TSDB configuration for multipliers and units
    const tsdbConfig = await fetchTsdbConfig()
    
    // Weave Studio's instant energy sensors
    const weaveSensors = [
      "vertriqe_25245_cttp",  // AC 1 - Instant Energy
      "vertriqe_25247_cttp",  // AC 2 - Instant Energy
      "vertriqe_25248_cttp"   // Combined - Instant Energy
    ]
    
    const now = Math.floor(Date.now() / 1000)
    const thirtyDaysAgo = now - (30 * 24 * 3600) // 30 days in seconds
    
    // Fetch data for each sensor
    const sensorPromises = weaveSensors.map(async (sensorKey) => {
      const payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: thirtyDaysAgo,
          end_timestamp: now,
          downsampling: 86400, // Daily aggregation
          aggregation: "sum"    // Sum for energy consumption
        }
      }

      const response = await fetch("https://gtsdb-admin.vercel.app/api/tsdb?apiUrl=http%3A%2F%2F35.221.150.154%3A5556", {
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
        return result.data.data.map((point: any) => {
          const config = getKeyConfig(sensorKey, tsdbConfig)
          return {
            timestamp: point.timestamp,
            value: point.value * config.multiplier + config.offset,
            key: sensorKey
          }
        })
      }
      return []
    })

    const allSensorResults = await Promise.all(sensorPromises)
    
    // Combine all sensor data and aggregate by timestamp
    const timeValueMap = new Map<number, number>()
    
    allSensorResults.flat().forEach((point: any) => {
      const existingValue = timeValueMap.get(point.timestamp) || 0
      timeValueMap.set(point.timestamp, existingValue + point.value)
    })
    
    // Convert to final format
    const aggregatedData: WeaveSensorData[] = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // Cache for 30 minutes
    await redis.set(cacheKey, JSON.stringify(aggregatedData), 30 * 60)
    
    console.log(`✅ Weave Studio sensor data fetched: ${aggregatedData.length} data points`)
    return aggregatedData
  } catch (error) {
    console.error("Error fetching Weave Studio sensor data:", error)
    return []
  }
}

function calculateEnergyMetrics(sensorData: HuntSensorData[] | WeaveSensorData[], _config: EnergyConfig) {
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
  
  // Extract actual usage values (convert to monthly aggregates if needed)
  const actualUsage = sensorData.map(point => point.value)
  
  // Energy forecast stays the same (dummy data for now)
  const energyForecast = [2200, 2400, 2300, 2500, 2800, 3500, 3400, 3200, 3000, 2800, 2200, 2300]
  
  // Baseline forecast = 125.5% of actual usage
  const baselineForecast = actualUsage.map(usage => usage * 1.255)
  
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
      console.log("✅ Successfully fetched weather data, processing...")
      weatherData = processWeatherData(currentWeatherData)
      console.log("✅ Using real weather data for dashboard")
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
      
      // Fetch sensor data based on user
      const sensorData = user.name === "The Hunt" 
        ? await fetchHuntSensorData()
        : await fetchWeaveSensorData()
      
      // Calculate energy metrics
      const metrics = calculateEnergyMetrics(sensorData, config)
      
      // Generate date labels for the last 30 days
      const dateLabels = sensorData.map(point => {
        const date = new Date(point.timestamp * 1000)
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
      })
      
      energyUsageData = {
        labels: dateLabels.length > 0 ? dateLabels : ["No Data"],
        actualUsage: sensorData.map(point => point.value), // Cumulative readings per day
        energyForecast: [], // Empty for Hunt user
        baselineForecast: [], // Empty for Hunt user
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
      
      console.log(`✅ Using real energy data for ${user.name}`)
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
      
      console.log("✅ Using minimal energy data for other users")
    }

    const dashboardData = {
      ...weatherData,
      energyUsage: energyUsageData,
      energySavings: energySavingsData,
      userName: user.name
    }

    console.log("✅ Dashboard data prepared successfully")
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
