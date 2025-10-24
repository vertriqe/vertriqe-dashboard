import { redis } from "../lib/redis"

async function loadUsers() {
  try {
    console.log("Loading users into Redis...")

    // Clear existing user data
    await redis.del("vertriqe_auth")

    // Set the updated user list with all users
    const users = [
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
      }
    ]

    await redis.set("vertriqe_auth", JSON.stringify(users))

    console.log("✓ Users loaded successfully!")
    console.log("\nLoaded users:")
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`)
    })

    // Set location data for Weave Studio
    await redis.set("user_location:weave@vertriqe.com", JSON.stringify({
      name: "To Kwa Wan",
      lat: "22.32366",
      lon: "114.188835"
    }))
    console.log("\n✓ Location set for Weave Studio (To Kwa Wan)")

    // Set location data for About Coffee Jeju
    await redis.set("user_location:coffee@vertriqe.com", JSON.stringify({
      name: "Jeju",
      lat: "33.4890",
      lon: "126.4983"
    }))
    console.log("✓ Location set for About Coffee Jeju (Jeju)")

    // Set location data for TNL
    await redis.set("user_location:tnl@vertriqe.com", JSON.stringify({
      name: "Yau Ma Tei",
      lat: "22.3123",
      lon: "114.1702"
    }))
    console.log("✓ Location set for TNL (Yau Ma Tei)")

    // Verify
    const storedData = await redis.get("vertriqe_auth")
    if (storedData) {
      const storedUsers = JSON.parse(storedData as string)
      console.log(`\n✓ Verification: ${storedUsers.length} users stored in Redis`)
    }

    process.exit(0)
  } catch (error) {
    console.error("Error loading users:", error)
    process.exit(1)
  }
}

loadUsers()
