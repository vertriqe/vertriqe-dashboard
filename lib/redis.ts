import Redis from "ioredis"

// Use in-memory storage if Redis URL is not set
const useMemoryStorage = !process.env.REDIS_URL

// In-memory storage for when Redis is not available
const memoryStore = new Map<string, any>()

if (useMemoryStorage) {
  console.log("Using in-memory storage (Redis URL not set)")
} else {
  console.log("Using Redis Cloud")
  console.log("Redis URL:", process.env.REDIS_URL?.replace(/:[^:]*@/, ':****@')) // Hide password in logs
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
      console.warn(`Redis get failed for key ${key}, using memory fallback:`, errorMessage)
      return memoryStore.get(key) || null
    }
  },

  async set(key: string, value: any, ttlSeconds?: number) {
    if (useMemoryStorage || !redisInstance) {
      memoryStore.set(key, value)
      return "OK"
    }

    try {
      if (ttlSeconds) {
        await redisInstance.set(key, value, 'EX', ttlSeconds)
      } else {
        await redisInstance.set(key, value)
      }
      // Also store in memory as backup
      memoryStore.set(key, value)
      return "OK"
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`Redis set failed for key ${key}, using memory fallback:`, errorMessage)
      memoryStore.set(key, value)
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
      console.warn(`Redis del failed for key ${key}, using memory fallback:`, errorMessage)
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
      console.warn("Redis ping failed, using memory fallback:", errorMessage)
      return "PONG"
    }
  }
}

// Get default users from environment variable
const getDefaultUsers = () => {
  try {
    const defaultUsersEnv = process.env.DEFAULT_USERS
    if (defaultUsersEnv) {
      return JSON.parse(defaultUsersEnv)
    }
  } catch (error) {
    console.warn("Failed to parse DEFAULT_USERS environment variable:", error)
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
    }
  ]
}

// Initialize storage and create dummy users
const initializeStorage = async () => {
  try {
    console.log("Initializing storage...")
    await redis.ping()
    console.log("Storage initialized successfully")

    // Check if there's corrupted data and clean it up
    const testData = await redis.get("vertriqe_auth")
    if (testData && typeof testData === "string" && testData.includes("[object Object]")) {
      console.log("Found corrupted data, cleaning up...")
      await redis.del("vertriqe_auth")
      console.log("Corrupted data cleaned up")
    }

    // If no user data exists, create default users
    if (!testData) {
      console.log("No user data found, creating default users...")
      const defaultUsers = getDefaultUsers()
      await redis.set("vertriqe_auth", JSON.stringify(defaultUsers))
      console.log("Default users created:")
      defaultUsers.forEach((user: any) => {
        console.log(`  - ${user.name} (${user.email})`)
      })
    } else {
      console.log("User data already exists")
    }

    // Set user location data for Weave Studio
    await redis.set("user_location:weave@vertriqe.com", JSON.stringify({
      name: "To Kwa Wan",
      lat: "22.32366",
      lon: "114.188835"
    }))
    console.log("Location data set for Weave Studio")
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error during storage initialization:", errorMessage)

    // Always ensure default users exist
    console.log("Ensuring default users exist...")
    const defaultUsers = getDefaultUsers()
    await redis.set("vertriqe_auth", JSON.stringify(defaultUsers))
    console.log("Default users ensured:")
    defaultUsers.forEach((user: any) => {
      console.log(`  - ${user.name} (${user.email})`)
    })

    // Still try to set location data for Weave Studio
    try {
      await redis.set("user_location:weave@vertriqe.com", JSON.stringify({
        name: "To Kwa Wan",
        lat: "22.32366", 
        lon: "114.188835"
      }))
      console.log("Location data set for Weave Studio")
    } catch (locationError) {
      console.error("Failed to set Weave Studio location data:", locationError)
    }
  }
}

// Initialize on module load
initializeStorage()
