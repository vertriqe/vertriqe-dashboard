import Redis from "ioredis"
import { logger } from "./logger"

// Use in-memory storage if Redis URL is not set
const useMemoryStorage = !process.env.REDIS_URL

// In-memory storage with TTL support and size limit
interface MemoryStoreEntry {
  value: any
  expiresAt?: number
}

class MemoryStore {
  private store = new Map<string, MemoryStoreEntry>()
  private readonly maxSize = 1000 // Prevent unbounded growth

  get(key: string): any | null {
    const entry = this.store.get(key)
    if (!entry) return null

    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return null
    }

    return entry.value
  }

  set(key: string, value: any, ttlSeconds?: number): void {
    // Implement LRU eviction if store is full
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value
      if (firstKey) this.store.delete(firstKey)
    }

    const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined
    this.store.set(key, { value, expiresAt })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key)
      }
    }
  }
}

const memoryStore = new MemoryStore()

// Cleanup expired entries every 5 minutes
if (useMemoryStorage) {
  setInterval(() => memoryStore.cleanup(), 5 * 60 * 1000)
}

// Create Redis instance only if we have proper Redis URL
const redisInstance = useMemoryStorage
  ? null
  : new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

// Create a wrapper that uses memory storage or Redis based on configuration
export const redis = {
  async get(key: string) {
    if (useMemoryStorage || !redisInstance) {
      return memoryStore.get(key) || null
    }

    try {
      const result = await redisInstance.get(key)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.warn(`Redis get failed for key ${key}, using memory fallback:`, errorMessage)
      return memoryStore.get(key) || null
    }
  },

  async set(key: string, value: any, ttlSeconds?: number) {
    if (useMemoryStorage || !redisInstance) {
      memoryStore.set(key, value, ttlSeconds)
      return "OK"
    }

    try {
      if (ttlSeconds) {
        await redisInstance.set(key, value, 'EX', ttlSeconds)
      } else {
        await redisInstance.set(key, value)
      }
      // Also store in memory as backup
      memoryStore.set(key, value, ttlSeconds)
      return "OK"
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.warn(`Redis set failed for key ${key}, using memory fallback:`, errorMessage)
      memoryStore.set(key, value, ttlSeconds)
      return "OK"
    }
  },

  async del(key: string) {
    if (useMemoryStorage || !redisInstance) {
      memoryStore.delete(key)
      return 1
    }

    try {
      await redisInstance.del(key)
      memoryStore.delete(key)
      return 1
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.warn(`Redis del failed for key ${key}, using memory fallback:`, errorMessage)
      memoryStore.delete(key)
      return 1
    }
  },

  async ping() {
    if (useMemoryStorage || !redisInstance) {
      return "PONG"
    }

    try {
      return await redisInstance.ping()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.warn("Redis ping failed, using memory fallback:", errorMessage)
      return "PONG"
    }
  }
}

// Get default users from environment variable
export const getDefaultUsers = () => {
  try {
    const defaultUsersEnv = process.env.DEFAULT_USERS
    if (defaultUsersEnv) {
      return JSON.parse(defaultUsersEnv)
    }
  } catch (error) {
    logger.warn("Failed to parse DEFAULT_USERS environment variable:", error)
  }
  
  // Fallback to hardcoded users if env var is not set or invalid
  return [
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
    },
    {
      name: "About Coffee Jeju",
      email: "coffee@vertriqe.com",
      password: "coffee-jeju-2025!",
    },
    {
      name: "TNL",
      email: "tnl@vertriqe.com",
      password: "tnl-vertriqe-2025!",
    },
    {
      name: "Telstar Office",
      email: "telstar_office@vertriqe.com",
      password: "telstar2025-vertriqe-F!",
    }
  ]
}
//25415,25416 cttp cctp
//TNL Sensors
//vertriqe_25415_cctp (cummulative energy usage kWh)
//vertriqe_25416_cctp (cummulative energy usage kWh)
//vertriqe_25415_cttp (instantaneous power usage kWh)
//vertriqe_25416_cttp (instantaneous power usage kWh)
// Initialize storage and create dummy users
const initializeStorage = async () => {
  try {
    logger.info("Initializing storage...")
    await redis.ping()
    logger.info("Storage initialized successfully")

    // Check if there's corrupted data and clean it up
    const testData = await redis.get("vertriqe_auth")
    if (testData && typeof testData === "string" && testData.includes("[object Object]")) {
      logger.info("Found corrupted data, cleaning up...")
      await redis.del("vertriqe_auth")
      logger.info("Corrupted data cleaned up")
    }

    // If no user data exists, create default users
    if (!testData) {
      logger.info("No user data found, creating default users...")
      const defaultUsers = getDefaultUsers()
      await redis.set("vertriqe_auth", JSON.stringify(defaultUsers))
      logger.info("Default users created:")
      defaultUsers.forEach((user: any) => {
        logger.info(`  - ${user.name} (${user.email})`)
      })
    } else {
      logger.info("User data already exists")
    }

    // Set user location data for Weave Studio
    await redis.set("user_location:weave@vertriqe.com", JSON.stringify({
      name: "To Kwa Wan",
      lat: "22.32366",
      lon: "114.188835"
    }))

    // Set user location data for About Coffee Jeju
    await redis.set("user_location:coffee@vertriqe.com", JSON.stringify({
      name: "Jeju",
      lat: "33.4890",
      lon: "126.4983"
    }))

    // Set user location data for TNL
    await redis.set("user_location:tnl@vertriqe.com", JSON.stringify({
      name: "Yau Ma Tei",
      lat: "22.3123",
      lon: "114.1702"
    }))

    // Set user location data for Telstar Office
    await redis.set("user_location:telstar_office@vertriqe.com", JSON.stringify({
      name: "Seoul",
      lat: "37.5665",
      lon: "126.9780"
    }))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error("Error during storage initialization:", errorMessage)

    // Always ensure default users exist
    logger.info("Ensuring default users exist...")
    const defaultUsers = getDefaultUsers()
    await redis.set("vertriqe_auth", JSON.stringify(defaultUsers))
    logger.info("Default users ensured:")
    defaultUsers.forEach((user: any) => {
      logger.info(`  - ${user.name} (${user.email})`)
    })

    // Still try to set location data for Weave Studio
    try {
      await redis.set("user_location:weave@vertriqe.com", JSON.stringify({
        name: "To Kwa Wan",
        lat: "22.32366",
        lon: "114.188835"
      }))
    } catch (locationError) {
      logger.error("Failed to set Weave Studio location data:", locationError)
    }

    // Still try to set location data for About Coffee Jeju
    try {
      await redis.set("user_location:coffee@vertriqe.com", JSON.stringify({
        name: "Jeju",
        lat: "33.4890",
        lon: "126.4983"
      }))
    } catch (locationError) {
      logger.error("Failed to set About Coffee Jeju location data:", locationError)
    }

    // Still try to set location data for TNL
    try {
      await redis.set("user_location:tnl@vertriqe.com", JSON.stringify({
        name: "Yau Ma Tei",
        lat: "22.3123",
        lon: "114.1702"
      }))
    } catch (locationError) {
      logger.error("Failed to set TNL location data:", locationError)
    }

    // Still try to set location data for Telstar Office
    try {
      await redis.set("user_location:telstar_office@vertriqe.com", JSON.stringify({
        name: "Seoul",
        lat: "37.5665",
        lon: "126.9780"
      }))
    } catch (locationError) {
      logger.error("Failed to set Telstar Office location data:", locationError)
    }
  }
}

// Initialize on module load
initializeStorage() // only enable this when you want to reset or ensure default users

export { initializeStorage }

export default redis
