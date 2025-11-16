const TSDB_API_URL = "https://gtsdb-admin.vercel.app/api/tsdb?apiUrl=http%3A%2F%2F35.221.150.154%3A5556"

interface DailyEnergyResult {
  success: boolean
  totalEnergy: number
  dataPoints: number
  date: string
  error?: string
}

export async function fetchDailyEnergy(
  id: string,
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

    // Build the TSDB key based on project id
    const key = `vertriqe_25245_${id}`

    // Prepare the TSDB request payload
    const payload = {
      operation: "read",
      key: key,
      Read: {
        start_timestamp: tsFrom,
        end_timestamp: tsTo
      }
    }

    // Fetch data from TSDB
    const response = await fetch(TSDB_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })

    const energyUsage = await response.json()

    // Check if the response was successful
    if (!energyUsage.success || !energyUsage.data) {
      return {
        success: false,
        totalEnergy: 0,
        dataPoints: 0,
        date: startOfDay.toISOString().split('T')[0],
        error: energyUsage.message || "Failed to fetch data from TSDB"
      }
    }

    // Access the nested data array
    const dataArray = energyUsage.data.data
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return {
        success: true,
        totalEnergy: 0,
        dataPoints: 0,
        date: startOfDay.toISOString().split('T')[0]
      }
    }

    // Calculate the sum of all values
    let totalEnergy = 0
    dataArray.forEach((entry: any) => {
      totalEnergy += entry.value
    })

    return {
      success: true,
      totalEnergy,
      dataPoints: dataArray.length,
      date: startOfDay.toISOString().split('T')[0]
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
