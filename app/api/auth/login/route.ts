import { type NextRequest, NextResponse } from "next/server"
import { redis, getDefaultUsers } from "@/lib/redis"
import { cookies } from "next/headers"
import { SignJWT } from "jose"

interface User {
  name: string
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe = false } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    console.log("Attempting to authenticate user:", email)

    // Get users from Redis (may be empty/non-existent)
    const usersData = await redis.get("vertriqe_auth")
    console.log("Redis data retrieved:", usersData)
    console.log("Type of Redis data:", typeof usersData)

    let users: User[] = []
    if (usersData) {
      try {
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
        // If parsing fails, treat as empty and attempt default fallback below
        users = []
      }
    } else {
      console.log("No user data found in Redis; will try default users fallback.")
    }

    // Find user with matching credentials in Redis first
    let user = users.find((u: User) => u.email === email && u.password === password)
    console.log("User found in Redis:", !!user)

    // If not found, check default users; if exists, insert into Redis and proceed
    if (!user) {
      const defaultUsers = getDefaultUsers()
      const defaultUser = defaultUsers.find((u: User) => u.email === email && u.password === password)
      console.log("User found in default users:", !!defaultUser)

      if (defaultUser) {
        // Insert/merge into Redis user list
        const updatedUsers = [...users]
        // Avoid duplicate by email
        if (!updatedUsers.some((u) => u.email === defaultUser.email)) {
          updatedUsers.push(defaultUser)
        }
        await redis.set("vertriqe_auth", JSON.stringify(updatedUsers))
        user = defaultUser
      }
    }

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Create JWT token with appropriate expiration
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const expirationTime = rememberMe ? "30d" : "24h" // 30 days for remember me, 24 hours for regular
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 // 30 days for remember me, 24 hours for regular
    
    const token = await new SignJWT({ email: user.email, name: user.name })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expirationTime)
      .sign(secret)

    // Set HTTP-only cookie
    const cookieStore = await cookies()
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAge,
      path: "/",
    })

    console.log("Login successful for:", user.name, `(${email})`)
    return NextResponse.json({ message: "Login successful", user: { name: user.name, email: user.email } })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      {
        message: "Internal server error",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
