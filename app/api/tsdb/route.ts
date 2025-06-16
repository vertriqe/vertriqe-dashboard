import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract the API URL from headers
    const apiUrl = request.headers.get("x-api-url")
    
    if (!apiUrl) {
      return NextResponse.json(
        { success: false, error: "Missing x-api-url header" },
        { status: 400 }
      )
    }

    // Make request to the TSDB API
    const response = await fetch("https://gtsdb-admin.vercel.app/api/tsdb", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-url": apiUrl,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`TSDB API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error calling TSDB API:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch data from TSDB" },
      { status: 500 }
    )
  }
}
