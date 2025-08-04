import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { redis } from "@/lib/redis"
import { fetchWeatherData, processWeatherData, type WeatherLocation } from "@/lib/weather-service"

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
  await new Promise((resolve) => setTimeout(resolve, 600))

  try {
    const userEmail = await getUserFromToken()

    if (!userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const userLocation = await getUserLocation(userEmail)

    // Fetch real weather data
    let weatherInfo
    const currentWeatherData = await fetchWeatherData(userLocation.lat, userLocation.lon)

    if (currentWeatherData) {
      const processedData = processWeatherData(currentWeatherData)
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

    const performanceData = {
      date: new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      weather: weatherInfo,
      metrics: {
        energySaved: "136kWh",
        co2Reduced: "112.1kg",
        estimateSaving: "$231.2",
        averageTemperature: "24.4°C",
        averageHumidity: "57%",
        averageOutdoorTemperature: currentWeatherData ? `${Math.round(currentWeatherData.current.temp_c)}°C` : "27.6°C",
      },
      usageData: {
        labels: ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"],
        normalUsage: [60, 80, 60, 70, 110, 110, 0],
        otUsage: [0, 10, 0, 0, 20, 0, 0],
        baseline: [90, 90, 100, 100, 160, 160, 160],
      },
      savingPercentage: {
        current: "24.5%",
        data: [25, 5, 28, 30, 40, 28, 0],
      },
      acUsage: {
        acOn: 38.7,
        acOff: 53.9,
        otOn: 7.4,
      },
    }

    return NextResponse.json(performanceData)
  } catch (error) {
    console.error("Performance API error:", error)

    // Return dummy data on error
    const performanceData = {
      date: new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      weather: {
        condition: "Cloudy",
        range: "28/31°C",
      },
      metrics: {
        energySaved: "136kWh",
        co2Reduced: "112.1kg",
        estimateSaving: "$231.2",
        averageTemperature: "24.4°C",
        averageHumidity: "57%",
        averageOutdoorTemperature: "27.6°C",
      },
      usageData: {
        labels: ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"],
        normalUsage: [60, 80, 60, 70, 110, 110, 0],
        otUsage: [0, 10, 0, 0, 20, 0, 0],
        baseline: [90, 90, 100, 100, 160, 160, 160],
      },
      savingPercentage: {
        current: "24.5%",
        data: [25, 5, 28, 30, 40, 28, 0],
      },
      acUsage: {
        acOn: 38.7,
        acOff: 53.9,
        otOn: 7.4,
      },
    }

    return NextResponse.json(performanceData)
  }
}
