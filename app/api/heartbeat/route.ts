import { NextRequest, NextResponse } from "next/server"
import { fetchCurrentSummedPower, fetchDailyEnergy } from "@/lib/energy-utils"
import { getKeysForSerial, getMeterMapping } from "@/lib/serial-mapping"

const VALID_TOKEN = "dualmint_sFD05QtMc1cEoiYt"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("serial")
    const token = searchParams.get("token")

    // Validate required parameters
    if (!id || !token) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required parameters: serial, and token are required" 
        },
        { status: 400 }
      )
    }

    // Validate token
    if (token !== VALID_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      )
    }

    // Get meter mapping for the serial number
    const mapping = getMeterMapping(id)
    if (!mapping) {
      return NextResponse.json(
        {
          success: false,
          error: `No meter mapping found for serial: ${id}`
        },
        { status: 404 }
      )
    }

    // Get GTSDB keys for the meter group
    const keys = getKeysForSerial(id)
    if (!keys || keys.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No meter keys found for serial: ${id}`
        },
        { status: 404 }
      )
    }

    // Fetch current summed power for all keys in the meter group
    const result = await fetchCurrentSummedPower(keys)

    return NextResponse.json({
      success: true,
      data: {
        serial: id,
        site: mapping.site,
        //meterGroup: mapping.meterGroup,
        //percentage: mapping.percentage,
        power: Math.round(result * mapping.percentage) / 100,
        unit: "kW"
      }
    })

  } catch (error) {
    console.error("Error in saved-energy API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    )
  }
}
