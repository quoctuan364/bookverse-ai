$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$containerName = "bookverse-demo-db"
$testDatabaseName = "bookverse_ai_test"
Set-Location $projectRoot

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
$baseUrl = $rawDatabaseUrl.Replace("127.0.0.1:5432", "127.0.0.1:$port")
$env:DATABASE_URL = $baseUrl -replace "/[^/?]+(\?.*)?$", "/$testDatabaseName`$1"
$env:RUN_EVALUATION_INTEGRATION = "1"

python scripts/run_python_integration_evidence.py
if ($LASTEXITCODE -ne 0) { throw "Python integration evidence không đạt." }
