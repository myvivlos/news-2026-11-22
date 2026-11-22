// make.fun news-image-20261122 bounty entry
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR_TAG = Buffer.from("IHDR", "ascii");
const MAX_BYTES = 1_048_576;
const REQUIRED_WIDTH = 1024;
const REQUIRED_HEIGHT = 1024;

function readAndVerifyEntryPng(sourcePath: string): Buffer {
  const data = readFileSync(sourcePath);

  if (data.byteLength > MAX_BYTES) {
    throw new Error(
      `entry.png exceeds maximum size of ${MAX_BYTES} bytes (got ${data.byteLength} bytes)`
    );
  }

  if (data.byteLength < PNG_SIGNATURE.byteLength || !data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("entry.png does not have a valid 8-byte PNG signature");
  }

  if (
    data.byteLength < 24 ||
    data.readUInt32BE(8) !== 13 ||
    !data.subarray(12, 16).equals(IHDR_TAG)
  ) {
    throw new Error("entry.png does not start with a valid PNG IHDR chunk");
  }

  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);

  if (width !== REQUIRED_WIDTH || height !== REQUIRED_HEIGHT) {
    throw new Error(
      `entry.png must be ${REQUIRED_WIDTH}x${REQUIRED_HEIGHT} pixels (got ${width}x${height})`
    );
  }

  return data;
}

function main(): void {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const sourcePath = join(moduleDir, "entry.png");
  const pngData = readAndVerifyEntryPng(sourcePath);

  const envOutputDir = process.env.MAKEFUN_OUTPUT_DIR;
  if (envOutputDir === "") {
    throw new Error("MAKEFUN_OUTPUT_DIR must not be an empty string");
  }
  const outputDir = envOutputDir ?? "/output";
  mkdirSync(outputDir, { recursive: true });

  const destinationPath = join(outputDir, "entry.png");
  writeFileSync(destinationPath, pngData);

  console.log(`Wrote ${destinationPath} (${pngData.byteLength} bytes)`);
}

try {
  main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
