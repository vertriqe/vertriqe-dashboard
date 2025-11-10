import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { getTsdbUrl } from "@/lib/api-config"
import { redis } from "@/lib/redis"

async function getUserFromToken(): Promise<{ email: string; name: string } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const { payload } = await jwtVerify(token, secret)

    return {
      email: payload.email as string,
      name: payload.name as string
    }
  } catch (error) {
    console.error("Error getting user from token:", error)
    return null
  }
}

// Calculate projected usage using regression model
function calculateProjectedUsage(
  temperature: number,
  regressionModel: any,
  hoursInMonth: number
): number {
  const { type, slope, intercept, coefficients } = regressionModel
  let hourlyPower = 0

  if (type === 'linear' && slope !== undefined && intercept !== undefined) {
    hourlyPower = slope * temperature + intercept
  } else if (type === 'quadratic' && coefficients) {
    const { a = 0, b = 0, c = 0 } = coefficients
    hourlyPower = a * temperature * temperature + b * temperature + c
  } else if (type === 'logarithmic' && coefficients) {
    const { a = 0, b = 0 } = coefficients
    hourlyPower = temperature > 0 ? a * Math.log(temperature) + b : 0
  } else if (type === 'exponential' && coefficients) {
    const { a = 1, b = 0 } = coefficients
    hourlyPower = a * Math.exp(b * temperature)
  }

  return Math.max(0, hourlyPower * hoursInMonth)
}

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getUserFromToken()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      return NextResponse.json(
        { success: false, error: "Missing siteId parameter" },
        { status: 400 }
      )
    }

    // Fetch baseline regression model from Redis
    const baselineKey = `baseline:${siteId}`
    const baselineStr = await redis.get(baselineKey)

    if (!baselineStr) {
      return NextResponse.json(
        { success: false, error: "No baseline model found for this site" },
        { status: 404 }
      )
    }

    const baseline = JSON.parse(baselineStr)
    const regressionModel = baseline.regression

    // Generate forecast for previous month only
    const now = new Date()
    const projections: { label: string; value: number; temperature: number }[] = []

    // Previous month (i = -1)
    const forecastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const month = forecastDate.getMonth() + 1
    const year = forecastDate.getFullYear()

    // Calculate hours in the month
    const hoursInMonth = new Date(year, month, 0).getDate() * 24

    // Fetch temperature data for previous month from TSDB
    const tempKey = baseline.tempKey || "vertriqe_25245_ambient_temp"
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const startTimestamp = Math.round(startDate.getTime() / 1000)
    const endTimestamp = Math.round(endDate.getTime() / 1000)

    // Fetch temperature data from TSDB
    const response = await fetch(getTsdbUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        operation: "read",
        key: tempKey,
        Read: {
          start_timestamp: startTimestamp,
          end_timestamp: endTimestamp,
          downsampling: 0, // Get all data points
          aggregation: "avg"
        }
      })
    })

    let tempData = await response.json()

    if (tempData && tempData.data && tempData.data.data) {
      tempData = tempData.data.data
    }

    // Calculate average temperature for the month
    if (!tempData || tempData.length === 0) {
      return NextResponse.json(
        { success: false, error: "No temperature data available for previous month" },
        { status: 404 }
      )
    }

    const sum = tempData.reduce((acc: number, point: any) => acc + point.value, 0)
    const avgTemperature = sum / tempData.length

    // Calculate projected usage using regression model
    const projectedUsage = calculateProjectedUsage(avgTemperature, regressionModel, hoursInMonth)

    projections.push({
      label: forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      value: projectedUsage,
      temperature: avgTemperature
    })

    return NextResponse.json({
      success: true,
      projections,
      model: {
        type: regressionModel.type,
        equation: baseline.regression.equation,
        rSquared: regressionModel.rSquared
      }
    })

  } catch (error) {
    console.error("Error generating forecast projection:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate forecast projection" },
      { status: 500 }
    )
  }
}
