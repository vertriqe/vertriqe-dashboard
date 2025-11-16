import { NextRequest, NextResponse } from "next/server"
import { fetchDailyEnergy } from "@/lib/energy-utils"

const VALID_TOKEN = "dualmint_sFD05QtMc1cEoiYt"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const timestamp = searchParams.get("timestamp")
    const token = searchParams.get("token")

    // Validate required parameters
    if (!id || !timestamp || !token) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required parameters: id, timestamp, and token are required" 
        },
        { status: 400 }
      )
    }

    // Validate token
    if (token !== VALID_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      )
    }

    // Parse the timestamp
    const inputTimestamp = parseInt(timestamp)
    if (isNaN(inputTimestamp)) {
      return NextResponse.json(
        { success: false, error: "Invalid timestamp format" },
        { status: 400 }
      )
    }

    // Fetch daily energy data
    const result = await fetchDailyEnergy(id, inputTimestamp)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || "Failed to fetch daily energy data" 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id,
        timestamp: inputTimestamp,
        date: result.date,
        totalEnergy: result.totalEnergy,
        dataPoints: result.dataPoints,
        unit: "kWh"
      }
    })

  } catch (error) {
    console.error("Error in daily-energy API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    )
  }
}
