
import { fetchTsdbConfig, getKeyConfig } from "@/lib/tsdb-config"
const TSDB_API_URL = "https://gtsdb-admin.vercel.app/api/tsdb?apiUrl=http%3A%2F%2F35.221.150.154%3A5556"


export interface DailyEnergyResult {
  success: boolean
  totalEnergy: number
  dataPoints: number
  date: string
  error?: string
}



export async function fetchDailyEnergy(
  keys: string[],
  timestamp: number
): Promise<DailyEnergyResult> {
  try {
    // Calculate start and end of day for the given timestamp
    const date = new Date(timestamp * 1000)
    const startOfDay = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0
    ))
    const endOfDay = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23, 59, 59
    ))

    const tsFrom = Math.round(startOfDay.getTime() / 1000)
    const tsTo = Math.round(endOfDay.getTime() / 1000)

    let totalEnergy = 0
    let totalPoints = 0
    let errorMsg = ""
    const isSpecial = keys.every(k => k.endsWith('_cttp') || k.endsWith('_weave'))
    // Fetch TSDB config for multipliers
    const tsdbConfig = await fetchTsdbConfig()
    for (const key of keys) {
      const payload = {
        operation: "read",
        key: key,
        Read: {
          start_timestamp: tsFrom,
          end_timestamp: tsTo
        }
      }
      try {
        const response = await fetch(TSDB_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        })
        const energyUsage = await response.json()
        if (!energyUsage.success || !energyUsage.data) {
          errorMsg += `Key ${key}: ${energyUsage.message || "Failed to fetch data from TSDB"}\n`
          continue
        }
        const dataArray = energyUsage.data.data
        const keyConfig = getKeyConfig(key, tsdbConfig)
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          if (isSpecial) {
            // For cttp or weave, use average * 24 * multiplier
            let sum = 0
            dataArray.forEach((entry: any) => {
              sum += entry.value
            })
            const avg = sum / dataArray.length
            totalEnergy += avg * 24 * keyConfig.multiplier
            totalPoints += dataArray.length
          } else {
            dataArray.forEach((entry: any) => {
              totalEnergy += entry.value * keyConfig.multiplier
            })
            totalPoints += dataArray.length
          }
        }
      } catch (err) {
        errorMsg += `Key ${key}: ${err instanceof Error ? err.message : err}\n`
      }
    }
    return {
      success: errorMsg.length === 0,
      totalEnergy,
      dataPoints: totalPoints,
      date: startOfDay.toISOString().split('T')[0],
      error: errorMsg.length > 0 ? errorMsg : undefined
    }
  } catch (error) {
    return {
      success: false,
      totalEnergy: 0,
      dataPoints: 0,
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      error: error instanceof Error ? error.message : "Internal server error"
    }
  }
}

export async function fetchCurrentSummedPower(
  keys: string[]
): Promise<number> {
  const tsdbConfig = await fetchTsdbConfig()
  let totalPower = 0
  for (const key of keys) {
    const payload = {
      operation: "read",
      key: key,
      Read: {
        lastx: 1
      }
    }
    try {
      const response = await fetch(TSDB_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
      const powerData = await response.json()
      if (!powerData.success || !powerData.data) {
        continue
      }
      const dataArray = powerData.data.data
      const keyConfig = getKeyConfig(key, tsdbConfig)
      if (Array.isArray(dataArray) && dataArray.length > 0) {
        totalPower += dataArray[0].value * keyConfig.multiplier
      }
    } catch (err) {
      console.error(`Error fetching current power for key ${key}:`, err)
    }
  }
  return totalPower
}