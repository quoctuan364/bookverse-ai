param(
  [switch]$SkipAiBuild
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.demo"
$composeProject = "bookverse-demo"

function Import-DotEnv([string]$path) {
  foreach ($line in Get-Content -LiteralPath $path) {
    if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
    $name, $value = $line -split '=', 2
    [Environment]::SetEnvironmentVariable(
      $name.Trim(),
      $value.Trim().Trim('"'),
      "Process"
    )
  }
}

Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Chưa có .env.demo. Chạy npm run demo:bootstrap trước."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Engine chưa chạy. Hãy mở Docker Desktop rồi thử lại."
}

Import-DotEnv $envFile

# Giữ môi trường demo tách khỏi stack Docker mặc định và các database đang có.
$env:BOOKVERSE_POSTGRES_PORT = "55432"
$env:BOOKVERSE_WEB_PORT = "3300"
$env:BOOKVERSE_AI_PORT = "8800"
$env:BOOKVERSE_DB_CONTAINER_NAME = "bookverse-demo-db"
$env:BOOKVERSE_WEB_CONTAINER_NAME = "bookverse-demo-web"
$env:BOOKVERSE_AI_CONTAINER_NAME = "bookverse-demo-ai-service"
$env:DATABASE_URL = "postgresql://$($env:BOOKVERSE_POSTGRES_USER):$($env:BOOKVERSE_POSTGRES_PASSWORD)@127.0.0.1:55432/$($env:BOOKVERSE_POSTGRES_DB)?schema=public"
$env:AI_SERVICE_URL = "http://127.0.0.1:8800"

$composeArgs = @(
  "compose",
  "--env-file", $envFile,
  "-p", $composeProject,
  "up", "-d"
)
if (-not $SkipAiBuild) {
  $composeArgs += "--build"
}
$composeArgs += @("db", "ai_service")

docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  throw "Không thể khởi động database và AI service demo."
}

Write-Host "[OK] Database demo: 127.0.0.1:55432"
Write-Host "[OK] AI service demo: http://127.0.0.1:8800"
Write-Host "[OK] Web: http://127.0.0.1:3000"
npm run dev
