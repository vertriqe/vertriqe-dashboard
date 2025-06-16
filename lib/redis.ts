import { Redis } from "@upstash/redis"

// Use in-memory storage if environment variables are not set
const useMemoryStorage = !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN

// In-memory storage for when Redis is not available
const memoryStore = new Map<string, any>()

if (useMemoryStorage) {
  console.log("Using in-memory storage (Redis environment variables not set)")
} else {
  console.log("Using Upstash Redis")
  console.log("Redis URL:", process.env.KV_REST_API_URL)
  console.log("Redis Token exists:", !!process.env.KV_REST_API_TOKEN)
}

// Create Redis instance only if we have proper Upstash credentials
const redisInstance = useMemoryStorage
  ? null
  : new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
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

  async set(key: string, value: any) {
    if (useMemoryStorage || !redisInstance) {
      memoryStore.set(key, value)
      return "OK"
    }

    try {
      await redisInstance.set(key, value)
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

// Initialize storage and create dummy user
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

    // If no user data exists, create dummy user
    if (!testData) {
      console.log("No user data found, creating dummy user...")
      const dummyUsers = [
        {
          email: "abby@abby.md",
          password: "aassddff",
        }
      ]
      await redis.set("vertriqe_auth", JSON.stringify(dummyUsers))
      console.log("Dummy user created: abby@abby.md / aassddff")
    } else {
      console.log("User data already exists")
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error during storage initialization:", errorMessage)

    // Always ensure dummy user exists
    console.log("Ensuring dummy user exists...")
    const dummyUsers = [
      {
        email: "abby@abby.md",
        password: "aassddff",
      }
    ]
    await redis.set("vertriqe_auth", JSON.stringify(dummyUsers))
    console.log("Dummy user ensured: abby@abby.md / aassddff")
  }
}

// Initialize on module load
initializeStorage()
