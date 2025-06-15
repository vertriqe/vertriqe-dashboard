import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { redis } from "@/lib/redis"
import {
  fetchWeatherData,
  fetchForecastData,
  processWeatherData,
  getDummyWeatherData,
  type WeatherLocation,
} from "@/lib/weather-service"

async function getUserFromToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      console.log("❌ No auth token found")
      return null
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const { payload } = await jwtVerify(token, secret)

    console.log(`✅ User authenticated: ${payload.email}`)
    return payload.email as string
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
    // Get user email from JWT token
    const userEmail = await getUserFromToken()

    if (!userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get user's location
    const userLocation = await getUserLocation(userEmail)

    // Fetch real weather data
    console.log("🌤️ Starting weather data fetch...")

    const currentWeatherData = await fetchWeatherData(userLocation.lat, userLocation.lon)
    const forecastData = await fetchForecastData(userLocation.lat, userLocation.lon, 7)

    let weatherData
    if (currentWeatherData) {
      console.log("✅ Successfully fetched weather data, processing...")
      weatherData = processWeatherData(currentWeatherData, forecastData)
      console.log("✅ Using real weather data for dashboard")
    } else {
      console.log("❌ Failed to fetch weather data, using dummy data")
      weatherData = getDummyWeatherData()
    }

    const dashboardData = {
      ...weatherData,
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
