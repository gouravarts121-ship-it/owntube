import { ensureDirs } from "../src/config.mjs";
import { openDb } from "../src/db.mjs";
import { ingestSeeds } from "../src/ingest.mjs";

ensureDirs();
openDb();
const log = (line) => console.log(line);
const seeded = await ingestSeeds(log);
log(`seeded ${seeded.length} video(s)`);
