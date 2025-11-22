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
import { getWeaveDashboardSensors, getHuntCumulativeSensors, getTnlCumulativeSensors, getTelstarDashboardSensors } from "@/lib/sensor-config"
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
    // Silent error
  }

  return {
    savingsPercentage: 0,
    co2ReductionFactor: 11,
    costPerKwh: 1.317
  }
}

async function getBaselineForUser(userName: string): Promise<any> {
  try {
    const siteMapping: Record<string, string> = {
      "The Hunt": "hunt",
      "Weave Studio": "weave",
      "TNL": "tnl",
      "Telstar Office": "telstar"
    }

    const siteId = siteMapping[userName]
    if (!siteId) {
      return null
    }

    const baselineData = await redis.get(`baseline:${siteId}`)
    if (baselineData) {
      return JSON.parse(baselineData as string)
    }

    return null
  } catch (error) {
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
          downsampling: 86400,
          aggregation: "avg"
        }
      })
    })

    if (!tempResponse.ok) {
      return []
    }

    const tempData = await tempResponse.json()
    if (!tempData.success || !tempData.data.success) {
      return []
    }

    const tempConfig = getKeyConfig(tempKey, tsdbConfig)
    const tempPoints = tempData.data.data

    const baselineValues = timestamps.map((timestamp) => {
      const tempPoint = tempPoints.find((tp: any) =>
        Math.abs(tp.timestamp - timestamp) <= 1800
      )

      if (!tempPoint) return 0

      const temperature = tempPoint.value * tempConfig.multiplier + tempConfig.offset

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

      const energyKey = Array.isArray(baseline.energyKey) ? baseline.energyKey[0] : baseline.energyKey
      const isInstantPower = energyKey && (energyKey.includes('_weave') || energyKey.includes('_cttp'))

      if (isInstantPower) {
        baselineEnergy *= 24
      }

      return Math.max(0, baselineEnergy)
    })

    return baselineValues

  } catch (error) {
    return []
  }
}

async function fetchHuntSensorData(): Promise<HuntSensorData[]> {
  try {
    const cacheKey = "hunt_sensor_data"
    const tsdbConfig = await fetchTsdbConfig()
    const huntCumulativeSensors = getHuntCumulativeSensors()
    
    const now = Math.floor(Date.now() / 1000)
    const ninetyDaysAgo = now - (90 * 24 * 3600)
    
    const sensorPromises = huntCumulativeSensors.map(async (sensorKey) => {
      const payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: ninetyDaysAgo,
          end_timestamp: now,
          downsampling: 86400,
          aggregation: "max"
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
        return { key: sensorKey, data: [] }
      }

      const result = await response.json()
      
      let dataPoints = []
      if (result.success) {
        if (result.data.success && result.data.data) {
          dataPoints = result.data.data
        } else if (Array.isArray(result.data)) {
          dataPoints = result.data
        }
      }
      
      return {
        key: sensorKey,
        data: dataPoints
      }
    })

    const sensorResults = await Promise.all(sensorPromises)
    
    const timeValueMap = new Map<number, number>()
    
    sensorResults.forEach(({ key, data }) => {
      const keyConfig = getKeyConfig(key, tsdbConfig)

      data.forEach((point: any) => {
        const dateOfTs = new Date(point.timestamp * 1000).toISOString().split("T")[0]
        const tsOfDate = new Date(dateOfTs).getTime() / 1000

        const processedValue = point.value * keyConfig.multiplier + keyConfig.offset
        const existingValue = timeValueMap.get(tsOfDate) || 0
        const newValue = existingValue + processedValue
        timeValueMap.set(tsOfDate, newValue)
      })
    })
    
    let aggregatedData = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    await redis.set(cacheKey, JSON.stringify(aggregatedData), 1800)

    return aggregatedData
    
  } catch (error) {
    return []
  }
}

async function fetchWeaveSensorData(): Promise<WeaveSensorData[]> {
  try {
    const cacheKey = "weave_sensor_data"
    const tsdbConfig = await fetchTsdbConfig()
    const weaveSensors = getWeaveDashboardSensors()
    
    const now = Math.floor(Date.now() / 1000)
    const ninetyDaysAgo = now - (90 * 24 * 3600)
    
    const sensorPromises = weaveSensors.map(async (sensorKey) => {
      let payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: ninetyDaysAgo,
          end_timestamp: now,
          downsampling: 86400,
          aggregation: "avg"
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
        return []
      }

      const result = await response.json()
      
      let dataPoints = []
      if (result.success) {
        if (result.data.success && result.data.data) {
          dataPoints = result.data.data
        } else if (Array.isArray(result.data)) {
          dataPoints = result.data
        }
      }
      
      if (dataPoints.length > 0) {
        const isCTTP = true;

        const _result = dataPoints.map((point: any) => {
          const config = getKeyConfig(sensorKey, tsdbConfig)
          return {
            timestamp: point.timestamp,
            value: (point.value * config.multiplier + config.offset) * 24,
            key: sensorKey
          }
        })
        
        return _result
      }
      
      return []
    })

    const allSensorResults = await Promise.all(sensorPromises)
    
    const timeValueMap = new Map<number, number>()
    
    allSensorResults.flat().forEach((point: any) => {
      const dateOfTs = new Date(point.timestamp * 1000).toISOString().split("T")[0]
      const normalizedTimestamp = new Date(dateOfTs).getTime() / 1000
      
      const existingValue = timeValueMap.get(normalizedTimestamp) || 0
      timeValueMap.set(normalizedTimestamp, existingValue + point.value)
    })
    
    const aggregatedData: WeaveSensorData[] = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    await redis.set(cacheKey, JSON.stringify(aggregatedData), 30 * 60)
    
    return aggregatedData
  } catch (error) {
    return []
  }
}

interface TnlSensorData {
  timestamp: number
  value: number
}

async function fetchTnlSensorData(): Promise<TnlSensorData[]> {
  try {
    const cacheKey = "tnl_sensor_data"
    const tsdbConfig = await fetchTsdbConfig()
    const tnlCumulativeSensors = getTnlCumulativeSensors()

    const now = Math.floor(Date.now() / 1000)
    const ninetyDaysAgo = now - (90 * 24 * 3600)

    const sensorPromises = tnlCumulativeSensors.map(async (sensorKey) => {
      const payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: ninetyDaysAgo,
          end_timestamp: now,
          downsampling: 86400,
          aggregation: "max"
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
        return { key: sensorKey, data: [] }
      }

      const result = await response.json()

      let dataPoints = []
      if (result.success) {
        if (result.data.success && result.data.data) {
          dataPoints = result.data.data
        } else if (Array.isArray(result.data)) {
          dataPoints = result.data
        }
      }

      return {
        key: sensorKey,
        data: dataPoints
      }
    })

    const sensorResults = await Promise.all(sensorPromises)

    const timeValueMap = new Map<number, number>()

    sensorResults.forEach(({ key, data }) => {
      const keyConfig = getKeyConfig(key, tsdbConfig)

      data.forEach((point: any) => {
        const dateOfTs = new Date(point.timestamp * 1000).toISOString().split("T")[0]
        const tsOfDate = new Date(dateOfTs).getTime() / 1000

        const processedValue = point.value * keyConfig.multiplier + keyConfig.offset
        const existingValue = timeValueMap.get(tsOfDate) || 0
        const newValue = existingValue + processedValue
        timeValueMap.set(tsOfDate, newValue)
      })
    })

    let aggregatedData = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    await redis.set(cacheKey, JSON.stringify(aggregatedData), 1800)

    return aggregatedData

  } catch (error) {
    return []
  }
}

interface TelstarSensorData {
  timestamp: number
  value: number
}

async function fetchTelstarSensorData(): Promise<TelstarSensorData[]> {
  try {
    const cacheKey = "telstar_sensor_data"
    const tsdbConfig = await fetchTsdbConfig()
    const telstarSensors = getTelstarDashboardSensors()

    const now = Math.floor(Date.now() / 1000)
    const ninetyDaysAgo = now - (90 * 24 * 3600)

    const sensorPromises = telstarSensors.map(async (sensorKey) => {
      const payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: ninetyDaysAgo,
          end_timestamp: now,
          downsampling: 86400,
          aggregation: "avg"
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
        return { key: sensorKey, data: [] }
      }

      const result = await response.json()

      let dataPoints = []
      if (result.success) {
        if (result.data.success && result.data.data) {
          dataPoints = result.data.data
        } else if (Array.isArray(result.data)) {
          dataPoints = result.data
        }
      }

      return {
        key: sensorKey,
        data: dataPoints
      }
    })

    const sensorResults = await Promise.all(sensorPromises)

    const timeValueMap = new Map<number, number>()

    sensorResults.forEach(({ key, data }) => {
      const keyConfig = getKeyConfig(key, tsdbConfig)

      data.forEach((point: any) => {
        const dateOfTs = new Date(point.timestamp * 1000).toISOString().split("T")[0]
        const tsOfDate = new Date(dateOfTs).getTime() / 1000

        const processedValue = (point.value * keyConfig.multiplier + keyConfig.offset) * 24
        const existingValue = timeValueMap.get(tsOfDate) || 0
        const newValue = existingValue + processedValue
        timeValueMap.set(tsOfDate, newValue)
      })
    })

    let aggregatedData = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    await redis.set(cacheKey, JSON.stringify(aggregatedData), 1800)

    return aggregatedData

  } catch (error) {
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
      return null
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const { payload } = await jwtVerify(token, secret)

    return { 
      email: payload.email as string,
      name: payload.name as string
    }
  } catch (error) {
    return null
  }
}

async function getUserLocation(email: string): Promise<WeatherLocation> {
  try {
    const userLocationData = await redis.get(`user_location:${email}`)

    if (userLocationData) {
      return JSON.parse(userLocationData as string)
    }

    const defaultLocationData = await redis.get("user_location:default")

    if (defaultLocationData) {
      return JSON.parse(defaultLocationData as string)
    }

    return {
      name: "thehunt",
      lat: "22.3089214",
      lon: "114.2241502",
    }
  } catch (error) {
    return {
      name: "thehunt",
      lat: "22.3089214",
      lon: "114.2241502",
    }
  }
}

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 500))

  try {
    const user = await getUserFromToken()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const userLocation = await getUserLocation(user.email)
    const currentWeatherData = await fetchWeatherData(userLocation.lat, userLocation.lon)

    let weatherData
    if (currentWeatherData) {
      weatherData = processWeatherData(currentWeatherData, userLocation.name)
    } else {
      weatherData = getDummyWeatherData()
    }

    let energyUsageData
    let energySavingsData

    if (user.name === "The Hunt" || user.name === "Weave Studio" || user.name === "TNL" || user.name === "Telstar Office") {
      const config = await getEnergyConfig()
      const tsdbConfig = await fetchTsdbConfig()
      const baseline = await getBaselineForUser(user.name)

      const sensorData = user.name === "The Hunt"
        ? await fetchHuntSensorData()
        : user.name === "TNL"
        ? await fetchTnlSensorData()
        : user.name === "Telstar Office"
        ? await fetchTelstarSensorData()
        : await fetchWeaveSensorData()

      const metrics = await calculateEnergyMetrics(sensorData, config, baseline, tsdbConfig)

      const dateLabels = sensorData.map(point => {
        const date = new Date(point.timestamp * 1000)
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
      })

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
      }

      energyUsageData = {
        labels: filteredLabels.length > 0 ? filteredLabels : ["No Data"],
        actualUsage: filteredActualUsage,
        energyForecast: [],
        baselineForecast: filteredBaselineForecast,
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
    } else {
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

    return NextResponse.json(fallbackData)
  }
}
