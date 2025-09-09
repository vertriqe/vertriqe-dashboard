import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    const userData = await redis.get("vertriqe_auth")
    if (userData) {
      const users = JSON.parse(userData as string)
      return NextResponse.json({ 
        success: true, 
        users: users.map((u: any) => ({ name: u.name, email: u.email }))
      })
    }
    return NextResponse.json({ success: false, message: "No users found" })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to get users" }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Clear existing user data
    await redis.del("vertriqe_auth")
    
    // Set the updated user list with Weave Studio
    const users = [
      {
        name: "Hai Sang",
        email: "abby@abby.md", 
        password: "aassddff",
      },
      {
        name: "The Hunt",
        email: "hunt@vertriqe.com",
        password: "huntpass123",
      },
      {
        name: "Weave Studio",
        email: "weave@vertriqe.com",
        password: "weave-vertriqe-2025!",
      }
    ]
    
    await redis.set("vertriqe_auth", JSON.stringify(users))
    
    // Also ensure location data is set
    await redis.set("user_location:weave@vertriqe.com", JSON.stringify({
      name: "To Kwa Wan",
      lat: "22.32366",
      lon: "114.188835"
    }))
    
    return NextResponse.json({ 
      success: true, 
      message: "User data reset successfully", 
      users: users.map(u => ({ name: u.name, email: u.email }))
    })
  } catch (error) {
    console.error("Error resetting user data:", error)
    return NextResponse.json({ success: false, error: "Failed to reset user data" }, { status: 500 })
  }
}