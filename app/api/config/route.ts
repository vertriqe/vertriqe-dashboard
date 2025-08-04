import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

interface EnergyConfig {
  savingsPercentage: number
  co2ReductionFactor: number  // kg CO2 per kWh saved
  costPerKwh: number         // HKD per kWh
}

const DEFAULT_CONFIG: EnergyConfig = {
  savingsPercentage: 25.5,    // 25.5% savings
  co2ReductionFactor: 11,     // 11 kg CO2 per kWh saved
  costPerKwh: 1.317          // 1.317 HKD per kWh
}

export async function GET() {
  try {
    // Try to get config from Redis
    const configData = await redis.get("energy_config")
    
    if (configData) {
      const config = JSON.parse(configData as string)
      return NextResponse.json(config)
    }
    
    // If no config exists, set and return default
    await redis.set("energy_config", JSON.stringify(DEFAULT_CONFIG))
    return NextResponse.json(DEFAULT_CONFIG)
    
  } catch (error) {
    console.error("Error fetching config:", error)
    // Return default config on error
    return NextResponse.json(DEFAULT_CONFIG)
  }
}

export async function PUT(request: Request) {
  try {
    const config: EnergyConfig = await request.json()
    
    // Validate config
    if (typeof config.savingsPercentage !== 'number' || 
        typeof config.co2ReductionFactor !== 'number' || 
        typeof config.costPerKwh !== 'number') {
      return NextResponse.json(
        { error: "Invalid configuration format" },
        { status: 400 }
      )
    }
    
    // Save to Redis
    await redis.set("energy_config", JSON.stringify(config))
    
    return NextResponse.json({ 
      success: true, 
      message: "Configuration updated successfully",
      config 
    })
    
  } catch (error) {
    console.error("Error updating config:", error)
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    )
  }
}