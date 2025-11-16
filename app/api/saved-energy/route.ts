import { NextRequest, NextResponse } from "next/server"
import { fetchDailyEnergy } from "@/lib/energy-utils"
import { PROJECT_METER_KEYS } from "@/lib/meter-keys"

const VALID_TOKEN = "dualmint_sFD05QtMc1cEoiYt"

// Generate a deterministic percentage between 10-16% based on the date
function calculateSavingsPercentage(timestamp: number): number {
  const date = new Date(timestamp * 1000)
  
  // Use year, month, and day to create a deterministic value
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1 // 1-12
  const day = date.getUTCDate() // 1-31
  
  // Create a seed value from the date components
  const seed = (year * 10000) + (month * 100) + day
  
  // Use a simple hash function to get a pseudo-random value
  const hash = ((seed * 9301 + 49297) % 233280) / 233280
  
  // Map the hash value (0-1) to a percentage between 10-16%
  const percentage = 11 + (hash * 5)
  
  // Round to 2 decimal places
  return Math.round(percentage * 100) / 100
}

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

    // Calculate the savings percentage based on the date
    const savingsPercentage = calculateSavingsPercentage(inputTimestamp)


    // Get all meter keys for the project
    const keys = PROJECT_METER_KEYS[id?.toLowerCase() || ""]
    if (!keys || keys.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No meter keys found for project id: ${id}`
        },
        { status: 400 }
      )
    }

    // Fetch daily energy data for all keys
    const result = await fetchDailyEnergy(keys, inputTimestamp)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || "Failed to fetch daily energy data" 
        },
        { status: 500 }
      )
    }

    const totalEnergy = result.totalEnergy
    const savedEnergy = (totalEnergy * savingsPercentage) / 100

    return NextResponse.json({
      success: true,
      data: {
        id,
        timestamp: inputTimestamp,
        date: result.date,
        projectedEnergy: totalEnergy,
        energyUsage: Math.round((totalEnergy - savedEnergy) * 100) / 100,
        savingsPercentage,
        savedEnergy: Math.round(savedEnergy * 100) / 100,
        dataPoints: result.dataPoints,
        unit: "kWh"
      }
    })

  } catch (error) {
    console.error("Error in saved-energy API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    )
  }
}
