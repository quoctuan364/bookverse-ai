import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildLockedFinalV2Manifest,
  type PilotExportForSplit,
} from "@/lib/recommendation-final-v2";

function requiredArgument(name: string): string {
  const value = process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.split("=", 2)[1]
    ?.trim();
  if (!value) throw new Error(`Thiếu --${name}=...`);
  return value;
}

async function main(): Promise<void> {
  const inputPath = path.resolve(requiredArgument("input"));
  const validationStart = requiredArgument("validation-start");
  const finalV2Start = requiredArgument("final-v2-start");
  const parsed = JSON.parse(await readFile(inputPath, "utf8")) as
    PilotExportForSplit & { exportedAt?: string };
  const datasetSha256 = parsed.datasetSha256;
  const deterministic: Record<string, unknown> = { ...parsed };
  delete deterministic.datasetSha256;
  delete deterministic.exportedAt;
  const calculatedDatasetSha256 = crypto
    .createHash("sha256")
    .update(JSON.stringify(deterministic))
    .digest("hex");
  if (calculatedDatasetSha256 !== datasetSha256) {
    throw new Error(
      "Dataset hash không khớp; export có thể đã bị thay đổi sau khi khóa.",
    );
  }
  const input = parsed;
  const manifest = buildLockedFinalV2Manifest(
    input,
    validationStart,
    finalV2Start,
  );
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const directory = path.resolve("outputs", "final-v2-lock", runId);
  await mkdir(directory, { recursive: true });
  const outputPath = path.join(directory, "final-v2-split-manifest.json");
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        ...manifest,
        createdAt: new Date().toISOString(),
        sourceExport: path.basename(inputPath),
      },
      null,
      2,
    ) + "\n",
    { encoding: "utf8", flag: "wx" },
  );
  console.log(
    JSON.stringify(
      {
        decision: manifest.decision,
        finalV2MetricStatus: manifest.finalV2MetricStatus,
        splitManifestSha256: manifest.splitManifestSha256,
        path: path.relative(process.cwd(), outputPath),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Khóa final_v2 thất bại.",
  );
  process.exitCode = 1;
});
