import { NextRequest, NextResponse } from "next/server"
import { API_CONFIG } from "@/lib/api-config"

interface TSDBDataPoint {
  key: string
  timestamp: number
  value: number
}

interface TSDBResponse {
  success: boolean
  data: {
    success: boolean
    data: TSDBDataPoint[]
  }
}

// The Hunt's cumulative sensors
const huntCumulativeSensors = [
  "vertriqe_25120_cctp",
  "vertriqe_25121_cctp", 
  "vertriqe_25122_cctp",
  "vertriqe_25123_cctp",
  "vertriqe_25124_cctp"
]

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || '30days' // default to 30 days
    
    // Define time ranges in seconds
    const timeRanges: Record<string, { seconds: number, downsampling: number }> = {
      '24hours': { seconds: 86400, downsampling: 3600 },
      '7days': { seconds: 604800, downsampling: 86400 },
      '30days': { seconds: 2592000, downsampling: 86400 },
      '12months': { seconds: 31536000, downsampling: 2592000 }
    }
    
    const selectedRange = timeRanges[timeRange] || timeRanges['30days']
    const now = Math.floor(Date.now() / 1000)
    const startTimestamp = now - selectedRange.seconds

    // Fetch data for all cumulative sensors
    const sensorPromises = huntCumulativeSensors.map(async (sensorKey) => {
      const payload = {
        operation: "read",
        key: sensorKey,
        Read: {
          start_timestamp: startTimestamp,
          end_timestamp: now,
          downsampling: selectedRange.downsampling,
          aggregation: "avg"
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
        console.warn(`Failed to fetch data for sensor ${sensorKey}`)
        return { key: sensorKey, data: [] }
      }

      const result: TSDBResponse = await response.json()
      return {
        key: sensorKey,
        data: result.success && result.data.success ? result.data.data : []
      }
    })

    const sensorResults = await Promise.all(sensorPromises)
    
    // Create a time-indexed map to sum values across sensors
    const timeValueMap = new Map<number, number>()
    
    sensorResults.forEach(({ data }) => {
      data.forEach((point: TSDBDataPoint) => {
        const existingValue = timeValueMap.get(point.timestamp) || 0
        timeValueMap.set(point.timestamp, existingValue + point.value)
      })
    })
    
    // Convert back to array format and sort by timestamp
    const aggregatedData = Array.from(timeValueMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp)

    return NextResponse.json({
      success: true,
      timeRange,
      sensorKeys: huntCumulativeSensors,
      data: aggregatedData,
      totalDataPoints: aggregatedData.length
    })

  } catch (error) {
    console.error("Error fetching Hunt sensor data:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch sensor data",
        data: []
      },
      { status: 500 }
    )
  }
}