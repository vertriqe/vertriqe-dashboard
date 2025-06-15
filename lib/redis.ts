import { Redis } from "@upstash/redis"

// Add more detailed error checking
if (!process.env.KV_REST_API_URL) {
  console.error("KV_REST_API_URL environment variable is not set")
  throw new Error("KV_REST_API_URL environment variable is not set")
}

if (!process.env.KV_REST_API_TOKEN) {
  console.error("KV_REST_API_TOKEN environment variable is not set")
  throw new Error("KV_REST_API_TOKEN environment variable is not set")
}

console.log("Redis URL:", process.env.KV_REST_API_URL)
console.log("Redis Token exists:", !!process.env.KV_REST_API_TOKEN)

export const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

// Test the connection and clear any corrupted data
redis
  .ping()
  .then(async () => {
    console.log("Redis connection successful")

    // Check if there's corrupted data and clean it up
    try {
      const testData = await redis.get("vertriqe_auth")
      if (testData && typeof testData === "string" && testData.includes("[object Object]")) {
        console.log("Found corrupted data, cleaning up...")
        await redis.del("vertriqe_auth")
        console.log("Corrupted data cleaned up")
      }
    } catch (error) {
      console.error("Error checking/cleaning Redis data:", error)
    }
  })
  .catch((error) => {
    console.error("Redis connection failed:", error)
  })
