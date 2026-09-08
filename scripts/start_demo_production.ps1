$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.demo"

if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Chưa có .env.demo. Chạy npm run demo:bootstrap trước."
}

foreach ($line in Get-Content -LiteralPath $envFile) {
  if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
  $name, $value = $line -split '=', 2
  [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim().Trim('"'), "Process")
}

$env:DATABASE_URL = "postgresql://$($env:BOOKVERSE_POSTGRES_USER):$($env:BOOKVERSE_POSTGRES_PASSWORD)@127.0.0.1:55432/$($env:BOOKVERSE_POSTGRES_DB)?schema=public"
$env:AI_SERVICE_URL = "http://127.0.0.1:8800"
$env:NODE_ENV = "production"

Set-Location -LiteralPath $projectRoot
Write-Host "[OK] Web production demo: http://127.0.0.1:3300"
npm run start -- -p 3300
