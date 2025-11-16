import { NextRequest, NextResponse } from "next/server"

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
  const percentage = 10 + (hash * 6)
  // Round to 2 decimal places
  return Math.round(percentage * 100) / 100
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timestamp = searchParams.get("timestamp")
    if (!timestamp) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: timestamp" },
        { status: 400 }
      )
    }
    const inputTimestamp = parseInt(timestamp)
    if (isNaN(inputTimestamp)) {
      return NextResponse.json(
        { success: false, error: "Invalid timestamp format" },
        { status: 400 }
      )
    }
    const savingsPercentage = calculateSavingsPercentage(inputTimestamp)
    return NextResponse.json({
      success: true,
      data: {
        timestamp: inputTimestamp,
        savingsPercentage
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
