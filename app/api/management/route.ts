import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { redis } from "@/lib/redis"
import { fetchWeatherData, processWeatherData, type WeatherLocation } from "@/lib/weather-service"
import { fetchTsdbConfig, getKeyConfig, type TSDBDataPoint, type TSDBResponse, type TSDBConfig } from "@/lib/tsdb-config"
import { getTsdbUrl } from "@/lib/api-config"
import { getZonesByOwner } from "@/lib/sensor-config"

async function getUserFromToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const { payload } = await jwtVerify(token, secret)

    return payload.email as string
  } catch (error) {
    console.error("Error getting user from token:", error)
    return null
  }
}

async function fetchSensorData(sensorKey: string): Promise<{ value: number; timestamp: number } | null> {
  try {
    const now = Math.floor(Date.now() / 1000)
    const startTimestamp = now - 3600 // Last hour

    const payload = {
      operation: "read",
      key: sensorKey,
      Read: {
        lastx: 1
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
      throw new Error(`Failed to fetch sensor data for ${sensorKey}`)
    }


    const result: TSDBResponse = await response.json()
    console.log("Response body for", sensorKey, result.data.data)
    if (result.success && result.data.success && result.data.data.length > 0) {
      // Get the latest data point
      const latestPoint = result.data.data[result.data.data.length - 1]
      return { value: latestPoint.value, timestamp: latestPoint.timestamp }
    }

    return null
  } catch (error) {
    console.error(`Error fetching sensor data for ${sensorKey}:`, error)
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
    console.error("Error getting user location:", error)
    return {
      name: "thehunt",
      lat: "22.3089214",
      lon: "114.2241502",
    }
  }
}

export async function GET() {
  try {
    const userEmail = await getUserFromToken()

    if (!userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const userLocation = await getUserLocation(userEmail)

    // Fetch TSDB config
    const tsdbConfig = await fetchTsdbConfig()

    // Get user info from stored authentication data
    const userAuthData = await redis.get("vertriqe_auth")
    let currentUser = null
    if (userAuthData) {
      const users = JSON.parse(userAuthData as string)
      currentUser = users.find((u: any) => u.email === userEmail)
    }

    // Get zone sensors from centralized config based on user
    const zoneSensors = getZonesByOwner(currentUser?.name || "The Hunt")

    // Fetch real weather data
    let weatherInfo
    const currentWeatherData = await fetchWeatherData(userLocation.lat, userLocation.lon)

    if (currentWeatherData) {
      const processedData = processWeatherData(currentWeatherData, userLocation.name)
      weatherInfo = {
        condition: processedData.forecast.condition,
        range: processedData.forecast.range,
      }
    } else {
      weatherInfo = {
        condition: "Cloudy",
        range: "28/31°C",
      }
    }

    // Fetch real sensor data for each zone
    const zones = await Promise.all(
      zoneSensors.map(async (zone) => {
        try {
          // Fetch temperature and humidity data
          const [tempData, humData] = await Promise.all([
            fetchSensorData(zone.tempSensor),
            fetchSensorData(zone.humSensor)
          ])

          // Apply TSDB configuration
          const tempConfig = getKeyConfig(zone.tempSensor, tsdbConfig)
          const humConfig = getKeyConfig(zone.humSensor, tsdbConfig)
          
          const processedTemp = tempData !== null 
            ? (tempData.value * tempConfig.multiplier + tempConfig.offset)
            : null
            
          const processedHum = humData !== null 
            ? (humData.value * humConfig.multiplier + humConfig.offset)
            : null

          // Use the more recent timestamp between temp and hum data
          let lastUpdateTimestamp = 0
          if (tempData && humData) {
            lastUpdateTimestamp = Math.max(tempData.timestamp, humData.timestamp)
          } else if (tempData) {
            lastUpdateTimestamp = tempData.timestamp
          } else if (humData) {
            lastUpdateTimestamp = humData.timestamp
          }

          return {
            id: zone.id,
            name: zone.name,
            temperature: processedTemp !== null ? `${processedTemp.toFixed(1)}°C` : "N/A",
            humidity: processedHum !== null ? `${processedHum.toFixed(0)}%` : "N/A",
            image: "/placeholder.svg?height=200&width=400",
            savingModeEnabled: zone.savingModeEnabled,
            lastUpdate: lastUpdateTimestamp * 1000, // Convert to milliseconds for JavaScript Date
          }
        } catch (error) {
          console.error(`Error processing zone ${zone.id}:`, error)
          return {
            id: zone.id,
            name: zone.name,
            temperature: "N/A",
            humidity: "N/A", 
            image: "/placeholder.svg?height=200&width=400",
            savingModeEnabled: zone.savingModeEnabled,
            lastUpdate: Date.now(), // Use current time as fallback
          }
        }
      })
    )

    const managementData = {
      date: new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      weather: weatherInfo,
      estimatedSaving: "0%",
      zones,
    }

    return NextResponse.json(managementData)
  } catch (error) {
    console.error("Management API error:", error)

    // Return dummy data on error
    const managementData = {
      date: new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      weather: {
        condition: "Cloudy",
        range: "28/31°C",
      },
      estimatedSaving: "0%",
      zones: [
        {
          id: 1,
          name: "Area 1",
          temperature: "24.7°C",
          humidity: "68%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: true,
          lastUpdate: Date.now() - 300000, // 5 minutes ago
        },
        {
          id: 2,
          name: "Area 2",
          temperature: "24.1°C",
          humidity: "62%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: false,
          lastUpdate: Date.now() - 180000, // 3 minutes ago
        },
        {
          id: 3,
          name: "Area 3",
          temperature: "24.2°C",
          humidity: "58%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: true,
          lastUpdate: Date.now() - 600000, // 10 minutes ago
        },
        {
          id: 4,
          name: "Area 4",
          temperature: "25.2°C",
          humidity: "72%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: false,
          lastUpdate: Date.now() - 120000, // 2 minutes ago
        },
        {
          id: 5,
          name: "Area 5",
          temperature: "23.8°C",
          humidity: "65%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: true,
          lastUpdate: Date.now() - 240000, // 4 minutes ago
        },
      ],
    }

    return NextResponse.json(managementData)
  }
}
