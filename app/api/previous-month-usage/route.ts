import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { getTsdbUrl } from "@/lib/api-config"
import { fetchTsdbConfig, processTsdbData } from "@/lib/tsdb-config"

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

export async function GET(_request: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getUserFromToken()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date(); // UTC time
    const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0)); // First day of previous month at 00:00
    const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59)); // Last day of previous month at 23:59:59
    const tsFrom = Math.round(fromDate.getTime() / 1000);
    const tsTo = Math.round(toDate.getTime() / 1000);


    const response = await fetch(getTsdbUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        operation: "read",
        key: "vertriqe_25245_weave",
        Read: {
          start_timestamp: tsFrom,
          end_timestamp: tsTo
        }
      })
    })

    if (!response.ok) {
      throw new Error("Failed to fetch data from TSDB")
    }
    let data = await response.json()

    if(data && data.data && data.data.data){
      data = data.data.data
    }

    if (data && data.length > 0) {
      // Get TSDB multiplier config by fetchTsdbConfig()
      const tsdbConfig = await fetchTsdbConfig()

      // Apply TSDB config to all data points
      data = processTsdbData(data, "vertriqe_25245_weave", tsdbConfig);

      // Calculate average power consumption for the month
      const totalPower = data.reduce((sum: number, point: any) => sum + point.value, 0)
      const avgPower = totalPower / data.length
      const dailyAverage = avgPower * 24;
      const daysInMonth = Math.round((tsTo - tsFrom) / (60 * 60 * 24));
      

      // Calculate total energy usage for the month
      const totalUsage = dailyAverage * daysInMonth

      return NextResponse.json({
        success: true,
        usage: [{
          timestamp: tsFrom,
          value: totalUsage
        }],
        details: {
          avgPower,
          dailyAverage,
          daysInMonth,
          dataPoints: data.length
        }
      })
    } else {
      return NextResponse.json({ success: false, error: "No data available", data: data }, { status: 404 })
    }

  } catch (error) {
    console.error("Error fetching previous month usage:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch previous month usage" },
      { status: 500 }
    )
  }
}