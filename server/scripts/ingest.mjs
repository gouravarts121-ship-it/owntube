import path from "node:path";
import { ensureDirs, config } from "../src/config.mjs";
import { openDb } from "../src/db.mjs";
import { ingestDirectory, ingestFile } from "../src/ingest.mjs";

const target = process.argv[2];
if (!target) {
  console.error("usage: npm run ingest -- <file-or-directory>");
  process.exit(1);
}

ensureDirs();
openDb();
const log = (line) => console.log(line);
const abs = path.resolve(target);
if (/\.(mp4|mov|mkv|webm|m4v)$/i.test(abs)) {
  const video = await ingestFile(abs, {}, log);
  log(`done: ${video.id}`);
} else {
  const videos = await ingestDirectory(abs, log);
  log(`done: ${videos.length} video(s)`);
}
console.log(`media: ${config.mediaDir}`);
