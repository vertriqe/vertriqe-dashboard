import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { cookies } from "next/headers"
import { SignJWT } from "jose"

interface User {
  name: string
  email: string
  password: string
}

const SUPER_ADMIN_PASSWORD = "dxSFOKT4ElXdCXTTtGkB"

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe = false } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    console.log("Super admin login attempt for email:", email)

    // Validate super admin password
    if (password !== SUPER_ADMIN_PASSWORD) {
      return NextResponse.json({ message: "Invalid super admin password" }, { status: 401 })
    }

    // Get users from Redis to find the target user
    const usersData = await redis.get("vertriqe_auth")
    console.log("Redis data retrieved for super admin:", usersData)

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
      if (typeof usersData === "string") {
        users = JSON.parse(usersData)
      } else {
        users = usersData as User[]
      }
    } catch (parseError) {
      console.error("Failed to parse user data:", parseError)
      return NextResponse.json(
        {
          message: "Invalid user data format in storage",
          debug: "Failed to parse stored user data",
        },
        { status: 500 },
      )
    }

    if (!Array.isArray(users)) {
      console.error("User data is not an array:", users)
      return NextResponse.json(
        {
          message: "Invalid user data structure",
          debug: "User data is not in expected array format",
        },
        { status: 500 },
      )
    }

    // Find the target user to impersonate
    const targetUser = users.find((u: User) => u.email === email)
    console.log("Target user found:", !!targetUser)

    if (!targetUser) {
      return NextResponse.json({ message: "Target user not found" }, { status: 404 })
    }

    // Create JWT token with super admin flag
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")
    const expirationTime = rememberMe ? "30d" : "24h"
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24

    const token = await new SignJWT({ 
      email: targetUser.email, 
      name: targetUser.name,
      isSuperAdmin: true // Flag to indicate super admin mode
    })
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

    console.log("Super admin login successful, impersonating:", targetUser.name, `(${email})`)
    return NextResponse.json({ 
      message: "Super admin login successful", 
      user: { name: targetUser.name, email: targetUser.email },
      isSuperAdmin: true
    })
  } catch (error) {
    console.error("Super admin login error:", error)
    return NextResponse.json(
      {
        message: "Internal server error",
        debug: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// GET endpoint to retrieve available users for super admin
export async function GET() {
  try {
    const usersData = await redis.get("vertriqe_auth")
    
    if (!usersData) {
      return NextResponse.json({ users: [] })
    }

    let users: User[]
    try {
      if (typeof usersData === "string") {
        users = JSON.parse(usersData)
      } else {
        users = usersData as User[]
      }
    } catch (parseError) {
      console.error("Failed to parse user data:", parseError)
      return NextResponse.json({ users: [] })
    }

    if (!Array.isArray(users)) {
      return NextResponse.json({ users: [] })
    }

    // Return users without passwords for security
    const safeUsers = users.map(user => ({
      name: user.name,
      email: user.email
    }))

    return NextResponse.json({ users: safeUsers })
  } catch (error) {
    console.error("Error fetching users for super admin:", error)
    return NextResponse.json({ users: [] })
  }
}
