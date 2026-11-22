// make.fun bounty entry: news-image-20261122
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR_CHUNK = Buffer.from("IHDR", "ascii");
const MAX_ENTRY_BYTES = 1_048_576;
const TARGET_WIDTH = 1024;
const TARGET_HEIGHT = 1024;

interface VerifiedPng {
  bytes: Buffer;
  width: number;
  height: number;
}

function loadAndVerifyPng(entryPath: string): VerifiedPng {
  let bytes: Buffer;
  try {
    bytes = readFileSync(entryPath);
  } catch (err: unknown) {
    if (err !== null && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      throw new Error(`Missing required file: entry.png was not found at ${entryPath}`);
    }
    throw err;
  }

  if (bytes.byteLength > MAX_ENTRY_BYTES) {
    throw new Error(
      `entry.png exceeds the ${MAX_ENTRY_BYTES}-byte limit (got ${bytes.byteLength} bytes)`
    );
  }

  if (bytes.byteLength < PNG_MAGIC.byteLength || !bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error("entry.png failed PNG verification: invalid 8-byte signature");
  }

  if (
    bytes.byteLength < 24 ||
    bytes.readUInt32BE(8) !== 13 ||
    !bytes.subarray(12, 16).equals(IHDR_CHUNK)
  ) {
    throw new Error("entry.png failed PNG verification: missing or malformed IHDR chunk");
  }

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);

  if (width !== TARGET_WIDTH || height !== TARGET_HEIGHT) {
    throw new Error(
      `entry.png dimensions must be ${TARGET_WIDTH}x${TARGET_HEIGHT} (got ${width}x${height})`
    );
  }

  return { bytes, width, height };
}

function resolveOutputDir(): string {
  const configured = process.env.MAKEFUN_OUTPUT_DIR;
  if (configured === "") {
    throw new Error("MAKEFUN_OUTPUT_DIR is set to an empty string; provide a valid directory path");
  }
  return configured ?? "/output";
}

function run(): void {
  const baseDir = dirname(fileURLToPath(import.meta.url));
  const sourceFile = join(baseDir, "entry.png");
  const verified = loadAndVerifyPng(sourceFile);

  const outDir = resolveOutputDir();
  mkdirSync(outDir, { recursive: true });

  const targetFile = join(outDir, "entry.png");
  writeFileSync(targetFile, verified.bytes);

  console.log(`Copied ${targetFile} (${verified.bytes.byteLength} bytes)`);
  console.log(`Verified PNG dimensions: ${verified.width}x${verified.height}`);
}

try {
  run();
} catch (err: unknown) {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${detail}`);
  process.exitCode = 1;
}
