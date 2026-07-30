$ErrorActionPreference = "Stop"

$databaseName = "bookverse_e2e_test"
$containerName = "bookverse-demo-db"
$projectRoot = Split-Path -Parent $PSScriptRoot

if ($databaseName -ne "bookverse_e2e_test") {
  throw "Tên database E2E không hợp lệ."
}

Set-Location $projectRoot
$databaseLine = Get-Content ".env.demo" |
  Where-Object { $_ -match "^DATABASE_URL=" } |
  Select-Object -First 1
if (-not $databaseLine) {
  throw "Thiếu DATABASE_URL trong .env.demo."
}

$baseUrl = $databaseLine.Substring("DATABASE_URL=".Length).Trim('"')
$hostPort = docker port $containerName "5432/tcp"
if ($LASTEXITCODE -ne 0 -or -not $hostPort) {
  throw "Không tìm thấy PostgreSQL container $containerName."
}
$port = ($hostPort -split ":")[-1].Trim()
$baseUrl = $baseUrl.Replace("127.0.0.1:5432", "127.0.0.1:$port")
$e2eUrl = $baseUrl -replace "/[^/?]+(\?.*)?$", "/$databaseName`$1"

$existing = docker exec $containerName psql -U bookverse_demo -d postgres -tAc `
  "SELECT 1 FROM pg_database WHERE datname='$databaseName';"
if ($LASTEXITCODE -ne 0) {
  throw "Không thể kiểm tra database E2E."
}
if ($existing) {
  throw "Database $databaseName đã tồn tại; dừng để không xóa nhầm dữ liệu."
}

docker exec $containerName psql -U bookverse_demo -d postgres -v ON_ERROR_STOP=1 -c `
  "CREATE DATABASE $databaseName;"
if ($LASTEXITCODE -ne 0) {
  throw "Không thể tạo database E2E."
}

try {
  $env:DATABASE_URL = $e2eUrl
  $env:ALLOWED_DESTRUCTIVE_DATABASES = $databaseName
  $env:BOOKVERSE_E2E_MODE = "1"

  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw "Migration E2E thất bại." }

  npx tsx scripts/seed_e2e_fixture.ts
  if ($LASTEXITCODE -ne 0) { throw "Seed E2E thất bại." }

  npx playwright test e2e/smoke.spec.ts e2e/recommendation-telemetry.spec.ts
  if ($LASTEXITCODE -ne 0) { throw "E2E smoke thất bại." }
}
finally {
  docker exec $containerName psql -U bookverse_demo -d postgres -v ON_ERROR_STOP=1 -c `
    "DROP DATABASE IF EXISTS $databaseName WITH (FORCE);"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Không thể xóa database E2E $databaseName."
  }
}
