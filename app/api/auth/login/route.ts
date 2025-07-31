import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { cookies } from "next/headers"
import { SignJWT } from "jose"

interface User {
  name: string
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    console.log("Attempting to authenticate user:", email)

    // Get users from Redis
    const usersData = await redis.get("vertriqe_auth")
    console.log("Redis data retrieved:", usersData)
    console.log("Type of Redis data:", typeof usersData)

    if (!usersData) {
      console.log("No user data found in Redis")
      return NextResponse.json(
        {
          message: "Authentication system not configured. Please contact administrator.",
          debug: "Redis key 'vertriqe_auth' is empty or doesn't exist",
        },
        { status: 500 },
      )
    }

    let users: User[]
    try {
      // Handle both string and already parsed object cases
      if (typeof usersData === "string") {
        users = JSON.parse(usersData)
      } else if (Array.isArray(usersData)) {
        users = usersData
      } else {
        throw new Error("Invalid data format")
      }

      console.log(
        "Parsed users:",
        users.map((u) => ({ name: u.name, email: u.email })),
      )
    } catch (error) {
      console.error("JSON parse error:", error)
      console.error("Raw data that failed to parse:", usersData)
      return NextResponse.json(
        {
          message: "Invalid user data format in database",
          debug: `Failed to parse data from Redis. Raw data: ${JSON.stringify(usersData)}`,
        },
        { status: 500 },
      )
    }

    // Find user with matching credentials
    const user = users.find((u: User) => u.email === email && u.password === password)
    console.log("User found:", !!user)

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Create JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const token = await new SignJWT({ email: user.email, name: user.name })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret)

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })

    console.log("Login successful for:", user.name, `(${email})`)
    return NextResponse.json({ message: "Login successful", user: { name: user.name, email: user.email } })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      {
        message: "Internal server error",
        debug: error.message,
      },
      { status: 500 },
    )
  }
}
