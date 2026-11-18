import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.mjs";

function exec(cmd, args, { timeout = 10 * 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const detail = String(stderr || err.message).split("\n").slice(-8).join("\n");
        reject(new Error(`${path.basename(cmd)} failed: ${detail}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function probe(file) {
  const { stdout } = await exec(config.ffprobe, [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    file,
  ]);
  const info = JSON.parse(stdout);
  const video = (info.streams || []).find((s) => s.codec_type === "video");
  const audio = (info.streams || []).find((s) => s.codec_type === "audio");
  if (!video) throw new Error("no video stream");
  const durationMs = Math.round(Number(info.format?.duration ?? video.duration ?? 0) * 1000);
  const width = Number(video.width || 0);
  const height = Number(video.height || 0);
  return {
    durationMs,
    width,
    height,
    hasAudio: Boolean(audio),
    videoCodec: video.codec_name,
    audioCodec: audio?.codec_name ?? null,
  };
}

function hlsVariants(sourceHeight) {
  const clean = config.hlsRenditions.filter((h) => h <= sourceHeight);
  if (clean.length) return clean;
  return [Math.min(sourceHeight, 360) || 360];
}

function upscaleFilter(height) {
  return `scale=-2:${height}:flags=bicubic`;
}

export async function transcode(file, id, meta, log = () => {}) {
  const outDir = path.join(config.mediaDir, "hls", id);
  const mp4Dir = path.join(config.mediaDir, "mp4");
  const thumbDir = path.join(config.mediaDir, "thumbs");
  await rm(outDir, { recursive: true, force: true });
  for (const dir of [outDir, mp4Dir, thumbDir]) await mkdir(dir, { recursive: true });

  const variants = hlsVariants(meta.height);
  const audioArgs = meta.hasAudio ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2"] : ["-an"];

  for (const [index, height] of variants.entries()) {
    const variantDir = path.join(outDir, `v${index}`);
    await mkdir(variantDir, { recursive: true });
    log(`hls ${height}p`);
    await exec(config.ffmpeg, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", file,
      "-vf", upscaleFilter(height),
      "-c:v", "libx264", "-profile:v", "main", "-preset", "veryfast", "-crf", "23",
      "-g", "48", "-keyint_min", "48", "-sc_threshold", "0",
      "-pix_fmt", "yuv420p",
      ...audioArgs,
      "-f", "hls",
      "-hls_time", "4",
      "-hls_playlist_type", "vod",
      "-hls_segment_filename", path.join(variantDir, "seg%03d.ts"),
      path.join(variantDir, "index.m3u8"),
    ]);
  }

  const master = ["#EXTM3U", "#EXT-X-VERSION:3"];
  for (const [index, height] of variants.entries()) {
    const width = Math.round((meta.width / meta.height) * height / 2) * 2 || height;
    const bandwidth = Math.round(height * 2200);
    master.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${width}x${height}`);
    master.push(`v${index}/index.m3u8`);
  }
  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(path.join(outDir, "master.m3u8"), master.join("\n") + "\n"),
  );

  const downloadHeight = Math.min(meta.height, 720);
  log(`mp4 ${downloadHeight}p`);
  await exec(config.ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", file,
    "-vf", upscaleFilter(downloadHeight),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    ...audioArgs,
    "-movflags", "+faststart",
    path.join(mp4Dir, `${id}.mp4`),
  ]);

  log("thumbnail");
  const seek = Math.min(2, Math.max(0, meta.durationMs / 1000 / 3));
  await exec(config.ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-ss", String(seek),
    "-i", file,
    "-frames:v", "1",
    "-vf", "scale='min(640,iw)':-2",
    "-c:v", "libwebp", "-quality", "80",
    path.join(thumbDir, `${id}.webp`),
  ]);

  return {
    hls: `/media/hls/${id}/master.m3u8`,
    mp4: `/media/mp4/${id}.mp4`,
    thumb: `/media/thumbs/${id}.webp`,
  };
}
