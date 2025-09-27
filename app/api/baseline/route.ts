import { NextRequest, NextResponse } from "next/server"
import { createClient } from "redis"

// Redis client setup with fallback
let redis: any = null

async function getRedisClient() {
  if (redis) return redis

  try {
    if (process.env.REDIS_URL) {
      redis = createClient({
        url: process.env.REDIS_URL
      })
      await redis.connect()
      console.log("Connected to Redis Cloud")
    } else {
      console.log("No Redis URL provided, using in-memory storage")
      return null
    }
  } catch (error) {
    console.error("Redis connection failed:", error)
    redis = null
  }

  return redis
}

// In-memory fallback storage
const inMemoryBaselines = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const baselineData = await request.json()
    const { siteId, siteName, regression, dataRange, energyKey, tempKey } = baselineData

    if (!siteId || !regression) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: siteId, regression" },
        { status: 400 }
      )
    }

    // Prepare baseline data for storage
    const baseline = {
      siteId,
      siteName,
      regression: {
        type: regression.type,
        equation: regression.equation,
        rSquared: regression.rSquared,
        slope: regression.slope,
        intercept: regression.intercept,
        coefficients: regression.coefficients
      },
      dataRange,
      energyKey,
      tempKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const client = await getRedisClient()
    const key = `baseline:${siteId}`

    if (client) {
      // Store in Redis
      await client.setEx(key, 86400 * 30, JSON.stringify(baseline)) // 30 days TTL
      console.log(`Baseline saved to Redis for site: ${siteId}`)
    } else {
      // Store in memory as fallback
      inMemoryBaselines.set(key, baseline)
      console.log(`Baseline saved to memory for site: ${siteId}`)
    }

    return NextResponse.json({
      success: true,
      message: `Baseline saved for ${siteName}`,
      data: baseline
    })

  } catch (error) {
    console.error("Error saving baseline:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save baseline" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      return NextResponse.json(
        { success: false, error: "Missing siteId parameter" },
        { status: 400 }
      )
    }

    const client = await getRedisClient()
    const key = `baseline:${siteId}`
    let baseline = null

    if (client) {
      // Get from Redis
      const data = await client.get(key)
      if (data) {
        baseline = JSON.parse(data)
      }
    } else {
      // Get from memory
      baseline = inMemoryBaselines.get(key)
    }

    if (!baseline) {
      return NextResponse.json(
        { success: false, error: "Baseline not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: baseline
    })

  } catch (error) {
    console.error("Error retrieving baseline:", error)
    return NextResponse.json(
      { success: false, error: "Failed to retrieve baseline" },
      { status: 500 }
    )
  }
}

// Get all baselines
export async function PUT(request: NextRequest) {
  try {
    const client = await getRedisClient()
    const baselines: any[] = []

    if (client) {
      // Get all baseline keys from Redis
      const keys = await client.keys('baseline:*')
      for (const key of keys) {
        const data = await client.get(key)
        if (data) {
          baselines.push(JSON.parse(data))
        }
      }
    } else {
      // Get all from memory
      for (const [key, value] of inMemoryBaselines.entries()) {
        if (key.startsWith('baseline:')) {
          baselines.push(value)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: baselines
    })

  } catch (error) {
    console.error("Error retrieving baselines:", error)
    return NextResponse.json(
      { success: false, error: "Failed to retrieve baselines" },
      { status: 500 }
    )
  }
}