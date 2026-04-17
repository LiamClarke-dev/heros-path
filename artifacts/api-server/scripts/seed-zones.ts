/**
 * Zone seeder CLI — loads static GeoJSON boundary files for all 4 cities into the `zones` table.
 *
 * Usage:
 *   tsx artifacts/api-server/scripts/seed-zones.ts
 *
 * The seeding logic itself lives in `src/lib/seedZones.ts` so it can also be invoked
 * automatically from the API server startup (see `src/index.ts`).
 */

import { seedAllCities } from "../src/lib/seedZones.js";

async function main(): Promise<void> {
  console.log("Running zone seeder for all cities...");
  await seedAllCities();
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeder failed:", err);
    process.exit(1);
  });
