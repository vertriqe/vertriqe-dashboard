import { NextResponse } from "next/server"
import { fetchWeatherData } from "@/lib/weather-service"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat") || "22.3028172"
  const lon = searchParams.get("lon") || "114.2581926"

  try {
    console.log(`Debug: Testing weather API with lat=${lat}, lon=${lon}`)

    // Test current weather
    const currentWeather = await fetchWeatherData(lat, lon)
    console.log("Current weather result:", currentWeather ? "SUCCESS" : "FAILED")

    return NextResponse.json({
      success: true,
      currentWeather: currentWeather ? "Data received" : "No data",
      currentWeatherData: currentWeather,
    })
  } catch (error) {
    console.error("Debug API error:", error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    })
  }
}
