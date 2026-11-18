import { createServer as createHttpServer } from "node:http";
import { config, ensureDirs } from "./config.mjs";
import { openDb, all } from "./db.mjs";
import { ingestSeeds } from "./ingest.mjs";
import { createServer } from "./http.mjs";

const log = (...args) => console.log(new Date().toISOString(), ...args);

ensureDirs();
openDb();

const seedEnabled = process.env.SEED !== "0";
if (seedEnabled && all("SELECT id FROM videos LIMIT 1").length === 0) {
  log("ingesting seed catalog (first run)…");
  const seeded = await ingestSeeds((line) => log("  " + line));
  log(`seeded ${seeded.length} videos`);
}

const server = createHttpServer(createServer());
server.listen(config.port, config.host, () => {
  log(`listening on http://${config.host}:${config.port}`);
  log(`admin token: ${config.adminToken}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    log(`shutting down (${signal})`);
    server.close(() => process.exit(0));
  });
}
