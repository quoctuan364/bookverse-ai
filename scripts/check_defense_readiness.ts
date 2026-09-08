import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const requiredFiles = [
  "app/page.tsx",
  "app/assistant/page.tsx",
  "app/read/page.tsx",
  "app/membership/page.tsx",
  "app/admin/page.tsx",
  "app/admin/analytics/page.tsx",
  "app/admin/integrations/page.tsx",
  "app/admin/subscriptions/page.tsx",
  "app/reading/insights/page.tsx",
  "docs/DEMO_DEFENSE_SCRIPT.md",
  "docs/DEFENSE_ARCHITECTURE.md",
  "docs/INSTALL_CLEAN_MACHINE.md",
  "docs/READER_RAG_BENCHMARK_PLAN.md",
  "playwright.config.ts",
  "e2e/smoke.spec.ts",
  "e2e/accessibility.spec.ts",
  ".github/workflows/quality.yml",
];

console.log("BookVerse AI - Preflight bảo vệ đồ án\n");

let failed = 0;
for (const relativePath of requiredFiles) {
  const exists = existsSync(path.join(projectRoot, relativePath));
  console.log(`[${exists ? "PASS" : "FAIL"}] ${relativePath}`);
  if (!exists) failed += 1;
}

if (failed > 0) {
  console.error(`\nThiếu ${failed} file/route bắt buộc. Dừng preflight.`);
  process.exitCode = 1;
} else {
  console.log("\nĐang kiểm tra dữ liệu demo ở chế độ chỉ đọc...\n");
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error("\n[FAIL] Không xác định được npm CLI hiện tại.");
    process.exitCode = 1;
  } else {
    // Gọi npm CLI qua chính Node hiện tại để chạy ổn định trên Windows/Linux.
    const result = spawnSync(process.execPath, [npmCli, "run", "demo:check"], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
    stdio: "inherit",
    });

    if (result.error || result.status !== 0) {
      console.error("\n[FAIL] Dữ liệu demo chưa sẵn sàng.");
      process.exitCode = 1;
    } else {
      console.log(
        "\n[PASS] Route, tài liệu và dữ liệu demo đã sẵn sàng cho buổi bảo vệ.",
      );

      if (process.argv.includes("--full")) {
        const fullChecks = [
          "lint",
          "typecheck",
          "test:unit",
          "test:python",
          "test:production-env",
          "test:production-mock-policy",
          "build",
          "test:e2e:isolated",
        ];
        for (const scriptName of fullChecks) {
          console.log(`\nĐang chạy npm run ${scriptName}...\n`);
          const check = spawnSync(
            process.execPath,
            [npmCli, "run", scriptName],
            {
              cwd: projectRoot,
              encoding: "utf8",
              shell: false,
              stdio: "inherit",
            },
          );
          if (check.error || check.status !== 0) {
            console.error(`\n[FAIL] npm run ${scriptName} không đạt.`);
            process.exitCode = 1;
            break;
          }
        }

        if (!process.exitCode) {
          console.log("\n[PASS] Toàn bộ cổng kiểm tra bảo vệ đã đạt.");
        }
      }
    }
  }
}
