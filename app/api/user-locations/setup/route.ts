import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import type { WeatherLocation } from "@/lib/weather-service"

export async function POST() {
  try {
    console.log("🔧 Setting up user locations...")

    // User location mappings
    const userLocations: Record<string, WeatherLocation> = {
      "abby@abby.md": {
        name: "maison",
        lat: "22.3028172",
        lon: "114.2581926",
      },
    }

    // Default location for other users
    const defaultLocation: WeatherLocation = {
      name: "thehunt",
      lat: "22.3089214",
      lon: "114.2241502",
    }

    // Store user locations in Redis
    for (const [email, location] of Object.entries(userLocations)) {
      await redis.set(`user_location:${email}`, JSON.stringify(location))
      console.log(`✅ Stored location for ${email}: ${location.name}`)
    }

    // Store default location
    await redis.set("user_location:default", JSON.stringify(defaultLocation))
    console.log(`✅ Stored default location: ${defaultLocation.name}`)

    return NextResponse.json({
      message: "User locations configured successfully",
      userLocations: Object.keys(userLocations),
      defaultLocation: defaultLocation.name,
    })
  } catch (error) {
    console.error("❌ Setup error:", error)
    return NextResponse.json({ message: "Failed to configure user locations", error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check what locations are stored
    const abbyLocation = await redis.get("user_location:abby@abby.md")
    const defaultLocation = await redis.get("user_location:default")

    console.log("📍 Current stored locations:")
    console.log("Abby:", abbyLocation ? JSON.parse(abbyLocation as string) : "Not found")
    console.log("Default:", defaultLocation ? JSON.parse(defaultLocation as string) : "Not found")

    return NextResponse.json({
      abbyLocation: abbyLocation ? JSON.parse(abbyLocation as string) : null,
      defaultLocation: defaultLocation ? JSON.parse(defaultLocation as string) : null,
    })
  } catch (error) {
    console.error("❌ Check error:", error)
    return NextResponse.json({ message: "Failed to check user locations", error: error.message }, { status: 500 })
  }
}
