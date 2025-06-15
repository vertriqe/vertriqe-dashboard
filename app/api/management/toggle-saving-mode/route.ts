// Add a new API route to toggle saving mode
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  // Simulate database update delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const body = await request.json()
  const { zoneId, enabled } = body

  // In a real application, this would update the database
  // For now, we'll just return success

  return NextResponse.json({
    success: true,
    message: `Saving mode for zone ${zoneId} has been ${enabled ? "enabled" : "disabled"}`,
  })
}
