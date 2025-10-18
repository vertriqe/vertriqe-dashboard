import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

interface SensorRow {
  project: string;
  serial_number: string;
  site: string;
  area: string;
  energy_meter: number | null;
  ac_controller: number | null;
  present_sensor: number | null;
  ambient_sensor: number | null;
  supply_air_sensor: number | null;
}

async function seedSensors() {
  try {
    // Read the TSV file
    const tsvPath = path.join(process.cwd(), "sensorTable.tsv");
    const tsvContent = fs.readFileSync(tsvPath, "utf-8");

    // Parse TSV
    const lines = tsvContent.trim().split("\n");
    const headers = lines[0].split("\t");

    console.log(`Reading ${lines.length - 1} sensor records from TSV file...`);

    let inserted = 0;
    let skipped = 0;

    // Process each row (skip header)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split("\t");

      // Map to sensor object
      const sensor: SensorRow = {
        project: values[0]?.trim() || "",
        serial_number: values[1]?.trim() || "",
        site: values[2]?.trim() || "",
        area: values[3]?.trim() || "",
        energy_meter: values[4]?.trim() ? parseInt(values[4].trim()) : null,
        ac_controller: values[5]?.trim() ? parseInt(values[5].trim()) : null,
        present_sensor: values[6]?.trim() ? parseInt(values[6].trim()) : null,
        ambient_sensor: values[7]?.trim() ? parseInt(values[7].trim()) : null,
        supply_air_sensor: values[8]?.trim() ? parseInt(values[8].trim()) : null,
      };

      // Skip rows without serial number
      if (!sensor.serial_number) {
        skipped++;
        continue;
      }

      try {
        await client.execute({
          sql: `
            INSERT OR REPLACE INTO sensors (
              project, serial_number, site, area,
              energy_meter, ac_controller, present_sensor,
              ambient_sensor, supply_air_sensor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            sensor.project,
            sensor.serial_number,
            sensor.site,
            sensor.area,
            sensor.energy_meter,
            sensor.ac_controller,
            sensor.present_sensor,
            sensor.ambient_sensor,
            sensor.supply_air_sensor,
          ],
        });

        inserted++;

        if (inserted % 10 === 0) {
          console.log(`Inserted ${inserted} records...`);
        }
      } catch (error) {
        console.error(`Error inserting row ${i}:`, error);
        console.error("Data:", sensor);
      }
    }

    console.log(`\n✓ Seeding complete!`);
    console.log(`  Inserted: ${inserted} records`);
    console.log(`  Skipped: ${skipped} records`);
  } catch (error) {
    console.error("Error seeding sensors:", error);
    process.exit(1);
  }
}

seedSensors();
