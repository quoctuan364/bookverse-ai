import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { assertSafeDatabase, type SafeDatabaseTarget } from "@/lib/database-safety";

interface Options {
  mode: "check" | "bootstrap";
}

interface ServerRow {
  databaseName: string;
  databaseUser: string;
  serverVersion: string;
  serverVersionNum: string;
  isSuperuser: boolean;
  canCreateInDatabase: boolean;
}

interface AvailableExtensionRow {
  defaultVersion: string;
  installedVersion: string | null;
}

interface VectorSmokeRow {
  vectorText: string;
  l2Distance: number;
  cosineDistance: number;
  innerProduct: number;
}

interface EmbeddingSchemaRow {
  columnType: string;
  isNullable: boolean;
}

interface IndexRow {
  indexName: string;
  indexDefinition: string;
}

const BOOTSTRAP_DATABASES = new Set([
  "bookverse_ai_fresh_migration_test",
  "bookverse_ai_full_deploy_rehearsal",
]);

function parseOptions(args: string[]): Options {
  const check = args.includes("--check");
  const bootstrap = args.includes("--bootstrap");
  const unknown = args.filter(
    (argument) => argument.startsWith("--") && !["--check", "--bootstrap"].includes(argument),
  );
  if (unknown.length > 0) throw new Error("Flag không hỗ trợ: " + unknown.join(", "));
  if (check === bootstrap) throw new Error("Phải chọn chính xác --check hoặc --bootstrap.");
  return { mode: check ? "check" : "bootstrap" };
}

function assertBootstrapTarget(target: SafeDatabaseTarget): void {
  if (target.databaseName === "bookverse_ai") {
    throw new Error("Cấm bootstrap pgvector trên database demo bookverse_ai.");
  }
  if (!BOOTSTRAP_DATABASES.has(target.databaseName)) {
    throw new Error(`Pgvector bootstrap không cho phép target ${target.databaseName}.`);
  }
}

async function writeReport(report: Record<string, unknown>, mode: string): Promise<string> {
  const directory = path.resolve(process.cwd(), "outputs", "deployment");
  await mkdir(directory, { recursive: true });
  const stem = new Date().toISOString().replace(/[:.]/g, "-") + "-" + process.pid;
  const reportPath = path.join(directory, `${stem}-pgvector-${mode}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
    encoding: "utf-8",
    flag: "wx",
  });
  return reportPath;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const target = assertSafeDatabase({
    operation: options.mode === "bootstrap" ? "destructive" : "read-only",
    databaseUrl: process.env.DATABASE_URL,
  });
  if (options.mode === "bootstrap") assertBootstrapTarget(target);

  const client = new PrismaClient();
  try {
    const serverRows = await client.$queryRawUnsafe<ServerRow[]>(`
      SELECT
        current_database() AS "databaseName",
        current_user AS "databaseUser",
        current_setting('server_version') AS "serverVersion",
        current_setting('server_version_num') AS "serverVersionNum",
        r.rolsuper AS "isSuperuser",
        has_database_privilege(current_user, current_database(), 'CREATE') AS "canCreateInDatabase"
      FROM pg_roles r
      WHERE r.rolname = current_user
    `);
    const server = serverRows[0];
    if (!server) throw new Error("Không đọc được PostgreSQL server metadata.");
    const expectedMajor = Number(process.env.EXPECTED_POSTGRES_MAJOR ?? "16");
    const actualMajor = Math.floor(Number(server.serverVersionNum) / 10_000);
    if (actualMajor !== expectedMajor) {
      throw new Error(`PostgreSQL major sai: expected=${expectedMajor}, actual=${actualMajor}.`);
    }

    const availableRows = await client.$queryRawUnsafe<AvailableExtensionRow[]>(`
      SELECT
        default_version AS "defaultVersion",
        installed_version AS "installedVersion"
      FROM pg_available_extensions
      WHERE name = 'vector'
    `);
    if (availableRows.length !== 1) {
      throw new Error("PostgreSQL image không có extension binary vector.");
    }
    if (!server.canCreateInDatabase || !server.isSuperuser) {
      throw new Error("Database user rehearsal không đủ quyền CREATE EXTENSION vector.");
    }

    if (options.mode === "bootstrap") {
      assertSafeDatabase({ operation: "destructive", databaseUrl: process.env.DATABASE_URL });
      assertBootstrapTarget(target);
      await client.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector");
    }

    const installedRows = await client.$queryRawUnsafe<AvailableExtensionRow[]>(`
      SELECT
        default_version AS "defaultVersion",
        installed_version AS "installedVersion"
      FROM pg_available_extensions
      WHERE name = 'vector'
    `);
    const installedVersion = installedRows[0]?.installedVersion ?? null;
    let vectorSmoke: VectorSmokeRow | null = null;
    if (installedVersion) {
      const smokeRows = await client.$queryRawUnsafe<VectorSmokeRow[]>(`
        SELECT
          '[1,2,3]'::vector::text AS "vectorText",
          ('[1,2,3]'::vector <-> '[1,2,4]'::vector)::float8 AS "l2Distance",
          ('[1,0,0]'::vector <=> '[1,0,0]'::vector)::float8 AS "cosineDistance",
          ('[1,2,3]'::vector <#> '[1,2,3]'::vector)::float8 AS "innerProduct"
      `);
      vectorSmoke = smokeRows[0] ?? null;
      if (
        !vectorSmoke ||
        vectorSmoke.vectorText !== "[1,2,3]" ||
        Math.abs(vectorSmoke.l2Distance - 1) > 1e-9 ||
        Math.abs(vectorSmoke.cosineDistance) > 1e-9 ||
        Math.abs(vectorSmoke.innerProduct + 14) > 1e-9
      ) {
        throw new Error("Vector cast hoặc distance operator trả kết quả sai.");
      }
    }
    if (options.mode === "bootstrap" && !installedVersion) {
      throw new Error("CREATE EXTENSION chạy xong nhưng pg_extension chưa có vector.");
    }

    const embeddingSchema = await client.$queryRawUnsafe<EmbeddingSchemaRow[]>(`
      SELECT
        format_type(a.atttypid, a.atttypmod) AS "columnType",
        NOT a.attnotnull AS "isNullable"
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'book_embeddings'
        AND a.attname = 'embedding'
        AND a.attnum > 0
        AND NOT a.attisdropped
    `);
    const indexes = await client.$queryRawUnsafe<IndexRow[]>(`
      SELECT indexname AS "indexName", indexdef AS "indexDefinition"
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'book_embeddings'
      ORDER BY indexname
    `);
    const annIndexes = indexes.filter((index) =>
      /\b(hnsw|ivfflat)\b|vector_(cosine|l2|ip)_ops/i.test(index.indexDefinition),
    );

    const report = {
      status: "PASS",
      mode: options.mode,
      databaseName: target.databaseName,
      server: {
        version: server.serverVersion,
        versionNumber: server.serverVersionNum,
        major: actualMajor,
        userIsSuperuser: server.isSuperuser,
        canCreateExtension: server.canCreateInDatabase,
      },
      vector: {
        binaryAvailable: true,
        defaultVersion: availableRows[0].defaultVersion,
        installedVersion,
        smoke: vectorSmoke,
      },
      embeddingColumn: embeddingSchema[0] ?? null,
      indexes,
      annIndexCount: annIndexes.length,
      designNotes: {
        declaredDimension: null,
        expectedProviderDimensions: {
          "text-embedding-3-small": 1536,
          "text-embedding-004": 768,
        },
        queryOperator: "<=> (cosine distance)",
        annOperatorClass: null,
        explanation:
          "Migration hiện khai báo vector không khóa dimension và không tạo HNSW/IVFFlat; chỉ có index bookId.",
      },
    };
    const reportPath = await writeReport(report, options.mode);
    console.log("[DATABASE] " + target.maskedUrl);
    console.log("[REPORT] " + path.relative(process.cwd(), reportPath));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Lỗi pgvector preflight không xác định.";
  console.error("[FAIL] " + message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]"));
  process.exitCode = 1;
});
