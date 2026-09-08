$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$containerName = "bookverse-demo-db"
Set-Location $projectRoot

if (-not $env:DATABASE_URL) {
  $databaseLine = Get-Content ".env.demo" |
    Where-Object { $_ -match "^DATABASE_URL=" } |
    Select-Object -First 1
  if (-not $databaseLine) { throw "Thiếu DATABASE_URL trong .env.demo." }

  $hostPort = docker port $containerName "5432/tcp"
  if ($LASTEXITCODE -ne 0 -or -not $hostPort) {
    throw "Không tìm thấy PostgreSQL container $containerName."
  }
  $port = ($hostPort -split ":")[-1].Trim()
  $rawDatabaseUrl = $databaseLine.Substring("DATABASE_URL=".Length).Trim('"')
  $env:DATABASE_URL = $rawDatabaseUrl.Replace(
    "127.0.0.1:5432",
    "127.0.0.1:$port"
  )
}

npx tsx scripts/check_demo_readiness.ts
if ($LASTEXITCODE -ne 0) { throw "Database demo chưa sẵn sàng." }
