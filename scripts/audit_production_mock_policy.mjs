import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const runtimeRoots = ["app", "actions", "components", "lib"];
const runtimeFiles = ["ai_service/main.py", "Dockerfile", "ai_service/Dockerfile", "docker-compose.yml", "docker-compose.production.yml"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".py"]);
const forbidden = [
  { label: "buildMockEvidence", pattern: /buildMockEvidence/u },
  { label: "buildMockSellerAiScore", pattern: /buildMockSellerAiScore/u },
  { label: "Seller AI Score", pattern: /Seller\s+AI\s+Score/iu },
  { label: "Math.random", pattern: /Math\.random\s*\(/u },
  { label: "production mock enabled", pattern: /BOOKVERSE_CHAT_MOCK_ENABLED:\s*["']true["']/u },
];

async function collectFiles(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await collectFiles(fullPath)));
    } else if (extensions.has(path.extname(entry.name))) {
      result.push(fullPath);
    }
  }
  return result;
}

const files = [
  ...(await Promise.all(runtimeRoots.map((directory) => collectFiles(path.join(root, directory))))).flat(),
  ...runtimeFiles.map((file) => path.join(root, file)),
];
const violations = [];

for (const file of files) {
  const content = await fs.readFile(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(content)) {
      violations.push({ file: path.relative(root, file), rule: rule.label });
    }
  }
}

if (violations.length > 0) {
  console.error(JSON.stringify({ status: "FAILED", checkedFiles: files.length, violations }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        status: "VERIFIED",
        checkedFiles: files.length,
        scope: "Next.js runtime, FastAPI main và production container config",
        violations: [],
      },
      null,
      2,
    ),
  );
}
