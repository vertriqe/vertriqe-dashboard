import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function POST() {
  try {
    // Sample user data to store in Redis (including the required dummy user)
    const users = [
      {
        email: "abby@abby.md",
        password: "aassddff",
      },
      {
        email: "admin@vertrique.com",
        password: "admin123",
      },
      {
        email: "user@vertrique.com",
        password: "user123",
      },
    ]

    // Store the users in Redis under the "vertriqe_auth" key
    // Use JSON.stringify to ensure proper serialization
    const serializedUsers = JSON.stringify(users)
    console.log("Storing users data:", serializedUsers)

    await redis.set("vertriqe_auth", serializedUsers)

    // Verify the data was stored correctly
    const storedData = await redis.get("vertriqe_auth")
    console.log("Verified stored data:", storedData)

    return NextResponse.json({
      message: "Authentication system configured successfully",
      users: users.map((u) => ({ email: u.email })), // Don't return passwords
      storedData: storedData, // For debugging
    })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json(
      { message: "Failed to configure authentication system", error: error.message },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Check what's currently in Redis
    const usersData = await redis.get("vertriqe_auth")
    console.log("Raw Redis data:", usersData)
    console.log("Type of Redis data:", typeof usersData)

    let parsedData = null
    if (usersData) {
      try {
        // Handle both string and already parsed object cases
        if (typeof usersData === "string") {
          parsedData = JSON.parse(usersData)
        } else {
          parsedData = usersData
        }
      } catch (parseError) {
        console.error("Parse error:", parseError)
        return NextResponse.json({
          exists: false,
          error: "Invalid data format in Redis",
          rawData: usersData,
        })
      }
    }

    return NextResponse.json({
      exists: !!usersData,
      data: parsedData,
      rawData: usersData, // For debugging
      dataType: typeof usersData,
    })
  } catch (error) {
    console.error("Check error:", error)
    return NextResponse.json(
      { message: "Failed to check authentication system", error: error.message },
      { status: 500 },
    )
  }
}
