import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { redis } from "@/lib/redis"
import { fetchWeatherData, fetchForecastData, processWeatherData, type WeatherLocation } from "@/lib/weather-service"

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
  // Simulate database fetch delay
  await new Promise((resolve) => setTimeout(resolve, 700))

  try {
    const userEmail = await getUserFromToken()

    if (!userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const userLocation = await getUserLocation(userEmail)

    // Fetch real weather data
    let weatherInfo
    const currentWeatherData = await fetchWeatherData(userLocation.lat, userLocation.lon)
    const forecastData = await fetchForecastData(userLocation.lat, userLocation.lon, 1)

    if (currentWeatherData) {
      const processedData = processWeatherData(currentWeatherData, forecastData)
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

    const managementData = {
      date: new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      weather: weatherInfo,
      estimatedSaving: "22.3%",
      zones: [
        {
          id: 1,
          name: "Office Zone A",
          temperature: "24.7°C",
          humidity: "68%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: true,
        },
        {
          id: 2,
          name: "Office Zone B",
          temperature: "24.1°C",
          humidity: "62%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: false,
        },
        {
          id: 3,
          name: "Pantry",
          temperature: "24.2°C",
          humidity: "58%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: true,
        },
        {
          id: 4,
          name: "Meeting Room A",
          temperature: "25.2°C",
          humidity: "72%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: false,
        },
      ],
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
      estimatedSaving: "22.3%",
      zones: [
        {
          id: 1,
          name: "Office Zone A",
          temperature: "24.7°C",
          humidity: "68%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: true,
        },
        {
          id: 2,
          name: "Office Zone B",
          temperature: "24.1°C",
          humidity: "62%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: false,
        },
        {
          id: 3,
          name: "Pantry",
          temperature: "24.2°C",
          humidity: "58%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: true,
        },
        {
          id: 4,
          name: "Meeting Room A",
          temperature: "25.2°C",
          humidity: "72%",
          image: "/placeholder.svg?height=200&width=400",
          savingModeEnabled: false,
        },
      ],
    }

    return NextResponse.json(managementData)
  }
}
