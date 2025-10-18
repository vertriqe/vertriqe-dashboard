import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function setupDatabase() {
  try {
    console.log("Creating sensors table...");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS sensors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT NOT NULL,
        serial_number TEXT NOT NULL UNIQUE,
        site TEXT,
        area TEXT,
        energy_meter INTEGER,
        ac_controller INTEGER,
        present_sensor INTEGER,
        ambient_sensor INTEGER,
        supply_air_sensor INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✓ Sensors table created successfully!");

    // Create index for faster lookups
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_serial_number ON sensors(serial_number)
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_project ON sensors(project)
    `);

    console.log("✓ Indexes created successfully!");

    console.log("\nDatabase setup complete!");
  } catch (error) {
    console.error("Error setting up database:", error);
    process.exit(1);
  }
}

setupDatabase();
