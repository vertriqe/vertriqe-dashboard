import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { siteId, inputData, monthlyBreakdown } = body

    if (!siteId) {
      return NextResponse.json(
        { success: false, error: "siteId is required" },
        { status: 400 }
      )
    }

    // Store input data
    if (inputData) {
      const inputKey = `bill_analysis:${siteId}:input`
      await redis.set(inputKey, JSON.stringify(inputData))
    }

    // Store monthly breakdown
    if (monthlyBreakdown) {
      const breakdownKey = `bill_analysis:${siteId}:breakdown`
      await redis.set(breakdownKey, JSON.stringify(monthlyBreakdown))
    }

    return NextResponse.json({
      success: true,
      message: "Bill analysis data cached successfully"
    })
  } catch (error) {
    console.error("Error caching bill analysis:", error)
    return NextResponse.json(
      { success: false, error: "Failed to cache bill analysis data" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get("siteId")

    if (!siteId) {
      return NextResponse.json(
        { success: false, error: "siteId is required" },
        { status: 400 }
      )
    }

    // Retrieve input data
    const inputKey = `bill_analysis:${siteId}:input`
    const inputDataStr = await redis.get(inputKey)
    const inputData = inputDataStr ? JSON.parse(inputDataStr) : null

    // Retrieve monthly breakdown
    const breakdownKey = `bill_analysis:${siteId}:breakdown`
    const breakdownStr = await redis.get(breakdownKey)
    const monthlyBreakdown = breakdownStr ? JSON.parse(breakdownStr) : null

    return NextResponse.json({
      success: true,
      data: {
        inputData,
        monthlyBreakdown
      }
    })
  } catch (error) {
    console.error("Error retrieving bill analysis:", error)
    return NextResponse.json(
      { success: false, error: "Failed to retrieve bill analysis data" },
      { status: 500 }
    )
  }
}
