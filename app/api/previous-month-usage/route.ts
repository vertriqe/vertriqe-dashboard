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

    
    //from beginning of the previousmonth
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    fromDate.setDate(1);
    fromDate.setHours(0, 0, 0, 0); // Set to the start of the day
    

    //to end of previous month
    const toDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    toDate.setDate(0); // Setting date to 0 sets it to the last day of the previous month
    toDate.setHours(23, 59, 59, 999); // Set to the end of the day

    
//  make use of
//   the logic of /energy of 12 months:
//   "
//   http://localhost:3000/api/tsdb" and
//   {"operation":"read","key":"vertriqe_25245_weave","Read":{"start_timestamp":1728297905,"end_timestamp":17
//   59833905,"downsampling":2592000,"ag
//   gregation":"avg"}} (1 year ago to
//   now)

      console.log({
        operation: "read",
        key: "vertriqe_25245_weave",
        Read: {
          start_timestamp: Math.round(fromDate.getTime() / 1000),
          end_timestamp: Math.round(new Date().getTime() / 1000),
          downsampling: 2592000, // Monthly downsampling
          aggregation: "avg"
        }
      })

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
          end_timestamp: Math.round(new Date().getTime() / 1000),
          downsampling: 2592000, // Monthly downsampling
          aggregation: "avg"
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

    console.log("data: ", data)
    if (data && data.length > 0) {

      // Get TSDB multiplier config by fetchTsdbConfig()
      const tsdbConfig = await fetchTsdbConfig()
      


      data = processTsdbData(data, "vertriqe_25245_weave", tsdbConfig);
      for (let point of data) {
        point.value = point.value * 24 * 30; // Approximate number of hours in a month
      }

      // Fetch non-AC usage from Redis (key: bill_analysis:weave:breakdown)
      const breakdownKey = `bill_analysis:weave:breakdown`
      const breakdownStr = await redis.get(breakdownKey)

      if (breakdownStr) {
        const monthlyBreakdown = JSON.parse(breakdownStr)
        
        // Add non-AC usage to each data point
        for (let point of data) {
          const pointDate = new Date(point.timestamp * 1000)
          const monthKey = pointDate.getMonth() + 1
          //console.log("monthKey: ", monthKey)
          // Find matching month in breakdown
          //console.log("monthlyBreakdown: ", monthlyBreakdown)
          const monthData = monthlyBreakdown.find((m: any) => m.month === monthKey)
          //console.log("monthData: ", Object.keys(monthData))
          if (monthData) {
            point.value = point.value
          }
        }
      }

      return NextResponse.json({ success: true, usage: data })
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