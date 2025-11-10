import { redis } from "@/lib/redis"
import { getTsdbUrl } from "@/lib/api-config"

export interface TSDBDataPoint {
  key: string
  timestamp: number
  value: number
}

export interface TSDBResponse {
  success: boolean
  data: {
    success: boolean
    data: TSDBDataPoint[]
    read_query_params: {
      lastx: number
      aggregation: string
    }
  }
}

export interface TSDBConfig {
  success: boolean
  data: {
    multipliers: Record<string, number>
    units: Record<string, string>
    offsets: Record<string, number>
  }
}

export interface KeyConfig {
  multiplier: number
  unit: string
  offset: number
}

/**
 * Fetches TSDB configuration from the API with Redis caching
 * Cache TTL: 1 hour
 */
export async function fetchTsdbConfig(): Promise<TSDBConfig | null> {
  try {
    // Check Redis cache first
    const cachedConfig = await redis.get("tsdb_config")
    if (cachedConfig) {
      console.log("✅ Using cached TSDB config")
      return JSON.parse(cachedConfig as string)
    }

    console.log("🔧 Fetching TSDB config from API...")
    const response = await fetch(getTsdbUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ operation: "getapiurlconfig" })
    })

    if (!response.ok) {
      throw new Error("Failed to fetch TSDB config")
    }

    const config = await response.json()
    
    // Cache for 1 hour
    await redis.set("tsdb_config", JSON.stringify(config), 3600)
    
    console.log("✅ TSDB config fetched and cached")
    return config
  } catch (error) {
    console.error("Error fetching TSDB config:", error)
    return null
  }
}

/**
 * Gets the configuration (multiplier, unit, offset) for a specific sensor key
 * Uses pattern matching to find the appropriate config
 */
export function getKeyConfig(key: string, tsdbConfig: TSDBConfig | null): KeyConfig {
  if (!tsdbConfig || !tsdbConfig.success) {
    return { multiplier: 1, unit: "", offset: 0 }
  }

  // Find matching pattern in config
  for (const pattern in tsdbConfig.data.multipliers) {
    const regex = new RegExp(pattern.replace('*', '.*'))
    if (regex.test(key)) {
      return {
        multiplier: tsdbConfig.data.multipliers[pattern] || 1,
        unit: tsdbConfig.data.units[pattern] || "",
        offset: tsdbConfig.data.offsets[pattern] || 0
      }
    }
  }
  
  return { multiplier: 1, unit: "", offset: 0 }
}

/**
 * Applies TSDB configuration to a data point
 */
export function applyTsdbConfig(value: number, config: KeyConfig): number {
  return value * config.multiplier + config.offset
}

/**
 * Processes an array of data points with TSDB configuration
 */
export function processTsdbData(
  data: Array<{ timestamp: number; value: number }>,
  sensorKey: string,
  tsdbConfig: TSDBConfig | null
): Array<{ timestamp: number; value: number }> {
  const config = getKeyConfig(sensorKey, tsdbConfig)
  return data.map(point => ({
    timestamp: point.timestamp,
    value: applyTsdbConfig(point.value, config)
  }))
}