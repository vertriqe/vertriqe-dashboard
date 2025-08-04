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
    savingsPercentage: 25.5,
    co2ReductionFactor: 11,
    costPerKwh: 1.317
  }
}

async function fetchHuntSensorData(): Promise<HuntSensorData[]> {
  try {
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
          aggregation: "avg"
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
    
    sensorResults.forEach(({ data }) => {
      data.forEach((point: any) => {
        const existingValue = timeValueMap.get(point.timestamp) || 0
        timeValueMap.set(point.timestamp, existingValue + point.value)
      })
    })
    
    // Convert back to array format and sort by timestamp
    const aggregatedData = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    console.log(`✅ Fetched data for ${huntCumulativeSensors.length} sensors, ${aggregatedData.length} data points`)
    return aggregatedData
    
  } catch (error) {
    console.error("Error fetching Hunt sensor data:", error)
    return []
  }
}

function calculateEnergyMetrics(sensorData: HuntSensorData[], config: EnergyConfig) {
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
  const energySaved = latestCumulative * (config.savingsPercentage / 100)
  const co2Reduced = energySaved * config.co2ReductionFactor
  const totalSaving = energySaved * config.costPerKwh
  
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

    if (user.name === "The Hunt") {
      console.log("🔧 Fetching real energy data for The Hunt...")
      
      // Get energy configuration
      const config = await getEnergyConfig()
      
      // Fetch Hunt's sensor data (this will be the actual cumulative data from GTSDB)
      const huntSensorData = await fetchHuntSensorData()
      
      // Calculate energy metrics
      const metrics = calculateEnergyMetrics(huntSensorData, config)
      
      energyUsageData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        actualUsage: metrics.actualUsage.slice(-12), // Get last 12 months
        energyForecast: metrics.energyForecast,
        baselineForecast: metrics.baselineForecast.slice(-12), // Get last 12 months
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
      
      console.log("✅ Using real energy data for The Hunt")
    } else {
      // Use dummy data for Hai Sang
      energyUsageData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        actualUsage: [2000, 2200, 2300, 2300, 700, null, null, null, null, null, null, null],
        energyForecast: [2200, 2400, 2300, 2500, 2800, 3500, 3400, 3200, 3000, 2800, 2200, 2300],
        baselineForecast: [2500, 2700, 2800, 3000, 3300, 4800, 4900, 4700, 4500, 3800, 3200, 2800],
      }
      
      energySavingsData = {
        percentage: "28.6%",
        totalSaving: "7,009.9HKD",
        co2Reduced: "3,397.7kg",
        energySaved: "4,123.5kWh",
      }
      
      console.log("✅ Using dummy energy data for Hai Sang")
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

    // Return dummy data on error
    const dummyData = {
      ...getDummyWeatherData(),
      energyUsage: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        actualUsage: [2000, 2200, 2300, 2300, 700, null, null, null, null, null, null, null],
        energyForecast: [2200, 2400, 2300, 2500, 2800, 3500, 3400, 3200, 3000, 2800, 2200, 2300],
        baselineForecast: [2500, 2700, 2800, 3000, 3300, 4800, 4900, 4700, 4500, 3800, 3200, 2800],
      },
      energySavings: {
        percentage: "28.6%",
        totalSaving: "7,009.9HKD",
        co2Reduced: "3,397.7kg",
        energySaved: "4,123.5kWh",
      },
    }

    console.log("⚠️ Returning dummy data due to error")
    return NextResponse.json(dummyData)
  }
}
