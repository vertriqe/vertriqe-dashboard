import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { getTsdbUrl } from "@/lib/api-config"
import { fetchTsdbConfig, processTsdbData } from "@/lib/tsdb-config"
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

export async function GET(_request: NextRequest) {
  try {
    // Get user from JWT token
    const user = await getUserFromToken()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }


    //from beginning of the previous month
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);

    //to end of previous month
    const toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    
//  make use of
//   the logic of /energy of 12 months:
//   "
//   http://localhost:3000/api/tsdb" and
//   {"operation":"read","key":"vertriqe_25245_weave","Read":{"start_timestamp":1728297905,"end_timestamp":17
//   59833905,"downsampling":2592000,"ag
//   gregation":"avg"}} (1 year ago to
//   now)

    const response = await fetch(getTsdbUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        operation: "read",
        key: "vertriqe_25245_weave",
        Read: {
          start_timestamp: Math.round(fromDate.getTime() / 1000),
          end_timestamp: Math.round(toDate.getTime() / 1000)
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

      // Calculate total hours in the previous month
      const daysInMonth = new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0).getDate()
      const hoursInMonth = daysInMonth * 24

      // Calculate total energy usage for the month
      const totalUsage = avgPower * hoursInMonth

      return NextResponse.json({
        success: true,
        usage: [{
          timestamp: Math.round(fromDate.getTime() / 1000),
          value: totalUsage
        }],
        details: {
          avgPower,
          hoursInMonth,
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