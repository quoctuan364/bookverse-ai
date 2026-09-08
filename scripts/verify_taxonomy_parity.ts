import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { taxonomyManifest } from "@/lib/interaction-taxonomy";

function pythonExecutable(): string {
  if (process.env.PYTHON_EXECUTABLE?.trim()) {
    return process.env.PYTHON_EXECUTABLE.trim();
  }
  return process.platform === "win32"
    ? path.resolve("ai_service", ".venv", "Scripts", "python.exe")
    : path.resolve("ai_service", ".venv", "bin", "python");
}

const result = spawnSync(pythonExecutable(), ["-m", "ai_service.taxonomy_manifest"], {
  cwd: process.cwd(),
  encoding: "utf-8",
});

if (result.status !== 0) {
  throw new Error(`Python taxonomy manifest lỗi: ${result.stderr.trim() || "UNKNOWN"}`);
}

const pythonManifest: unknown = JSON.parse(result.stdout);
const typescriptManifest = taxonomyManifest();
assert.deepEqual(pythonManifest, typescriptManifest, "TypeScript/Python taxonomy không parity.");
console.log(
  JSON.stringify(
    {
      status: "PASS",
      version: typescriptManifest.version,
      canonicalEvents: typescriptManifest.canonicalEvents.length,
      aliases: Object.keys(typescriptManifest.aliases).length,
      checksum: typescriptManifest.checksum,
    },
    null,
    2,
  ),
);
