#!/usr/bin/env node
// Prepares gallery photos for the web: auto-orients pixels per EXIF, strips EXIF,
// and outputs WebP + JPEG "desktop" / "mobile" / "preview" variants.
//
// Usage:
//   node scripts/optimize-images.mjs <file...> [--out=website/assets/images] [--crops=scripts/crops.json]
//
// Optional crop config (JSON), keyed by the input file's basename without extension.
// Coordinates are pixels measured on the AUTO-ORIENTED image (i.e. after EXIF rotation
// is applied), so they match what you see when you open the photo normally:
//   {
//     "gallery-10": {
//       "desktop": { "left": 900, "top": 0, "width": 5100, "height": 4000 },
//       "mobile":  { "left": 1700, "top": 200, "width": 2900, "height": 3700 }
//     }
//   }
// A photo with no entry (or a missing variant) is used uncropped for that variant.

import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const DESKTOP_MAX = 2000; // long side, px
const MOBILE_MAX = 1200; // long side, px
const PREVIEW_MAX = 800; // long side, px

const DESKTOP_WEBP_QUALITY = 82;
const DESKTOP_JPEG_QUALITY = 84;
const MOBILE_WEBP_QUALITY = 78;
const MOBILE_JPEG_QUALITY = 80;
const PREVIEW_WEBP_QUALITY = 72;
const PREVIEW_JPEG_QUALITY = 76;

function parseArgs(argv) {
  const files = [];
  let outDir = path.join(REPO_ROOT, "website/assets/images");
  let cropsPath = path.join(__dirname, "crops.json");
  for (const arg of argv) {
    if (arg.startsWith("--out=")) outDir = path.resolve(REPO_ROOT, arg.slice("--out=".length));
    else if (arg.startsWith("--crops=")) cropsPath = path.resolve(REPO_ROOT, arg.slice("--crops=".length));
    else files.push(path.resolve(process.cwd(), arg));
  }
  return { files, outDir, cropsPath };
}

async function loadCrops(cropsPath) {
  try {
    const raw = await readFile(cropsPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(0)}KB`;
}

async function makeVariant({ srcSharp, crop, maxSize, outDir, baseName, variant, webpQuality, jpegQuality }) {
  let pipeline = srcSharp.clone();
  if (crop) pipeline = pipeline.extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height });
  pipeline = pipeline.resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true });

  const webpPath = path.join(outDir, `${baseName}-${variant}.webp`);
  const jpegPath = path.join(outDir, `${baseName}-${variant}.jpg`);

  const { data: webpBuf, info: webpInfo } = await pipeline.clone().webp({ quality: webpQuality }).toBuffer({ resolveWithObject: true });
  const { data: jpegBuf, info: jpegInfo } = await pipeline.clone().jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer({ resolveWithObject: true });

  await writeFile(webpPath, webpBuf);
  await writeFile(jpegPath, jpegBuf);

  console.log(
    `  ${variant.padEnd(8)} ${String(webpInfo.width).padStart(4)}x${String(webpInfo.height).padEnd(4)}  webp ${fmtKB(webpBuf.length).padStart(6)}  jpg ${fmtKB(jpegBuf.length).padStart(6)}`
  );

  return { width: webpInfo.width, height: webpInfo.height };
}

async function processFile(filePath, crops, outDir) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".dng") {
    console.warn(`! ${path.basename(filePath)}: DNG (raw) not supported by this script — export to JPEG/HEIC first (Photos/Lightroom/Capture One), then re-run.`);
    return;
  }

  const baseName = path.basename(filePath, ext);
  console.log(`\n${baseName}${ext}`);

  // .rotate() with no args bakes in the EXIF orientation, then sharp strips all
  // metadata (including EXIF) on output by default since withMetadata() is not called.
  const oriented = sharp(filePath).rotate();
  const { info: orientedInfo } = await oriented.clone().jpeg().toBuffer({ resolveWithObject: true });
  console.log(`  source   ${orientedInfo.width}x${orientedInfo.height} (auto-oriented, EXIF stripped)`);

  const cropCfg = crops[baseName] || {};

  const desktopDims = await makeVariant({
    srcSharp: oriented,
    crop: cropCfg.desktop || null,
    maxSize: DESKTOP_MAX,
    outDir,
    baseName,
    variant: "desktop",
    webpQuality: DESKTOP_WEBP_QUALITY,
    jpegQuality: DESKTOP_JPEG_QUALITY,
  });

  await makeVariant({
    srcSharp: oriented,
    crop: cropCfg.mobile || null,
    maxSize: MOBILE_MAX,
    outDir,
    baseName,
    variant: "mobile",
    webpQuality: MOBILE_WEBP_QUALITY,
    jpegQuality: MOBILE_JPEG_QUALITY,
  });

  await makeVariant({
    srcSharp: oriented,
    crop: cropCfg.desktop || null,
    maxSize: PREVIEW_MAX,
    outDir,
    baseName,
    variant: "preview",
    webpQuality: PREVIEW_WEBP_QUALITY,
    jpegQuality: PREVIEW_JPEG_QUALITY,
  });

  return desktopDims;
}

async function main() {
  const { files, outDir, cropsPath } = parseArgs(process.argv.slice(2));
  if (files.length === 0) {
    console.error("Usage: node scripts/optimize-images.mjs <file...> [--out=DIR] [--crops=FILE]");
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });
  const crops = await loadCrops(cropsPath);

  for (const file of files) {
    try {
      await processFile(file, crops, outDir);
    } catch (err) {
      console.error(`! ${path.basename(file)}: ${err.message}`);
    }
  }
}

main();
