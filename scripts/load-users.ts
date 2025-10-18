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
      }
    ]

    await redis.set("vertriqe_auth", JSON.stringify(users))

    console.log("✓ Users loaded successfully!")
    console.log("\nLoaded users:")
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`)
    })

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
