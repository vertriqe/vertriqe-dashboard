import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

const REDIS_KEY = "vertriqe_automation_tsv"

export async function GET() {
  try {
    const data = await redis.get(REDIS_KEY)
    return NextResponse.json({ content: data || "" })
  } catch (error) {
    console.error("Error fetching automation config:", error)
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { content } = await request.json()
    
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: "Invalid content format" },
        { status: 400 }
      )
    }

    await redis.set(REDIS_KEY, content)
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error("Error updating automation config:", error)
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    )
  }
}
