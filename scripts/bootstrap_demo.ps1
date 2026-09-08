param(
  [switch]$SkipInstall,
  [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.demo"
$composeProject = "bookverse-demo"

function New-HexSecret([int]$bytes) {
  return [Convert]::ToHexString(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes($bytes)
  ).ToLowerInvariant()
}

function Import-DotEnv([string]$path) {
  foreach ($line in Get-Content -LiteralPath $path) {
    if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
    $name, $value = $line -split '=', 2
    $clean = $value.Trim().Trim('"')
    [Environment]::SetEnvironmentVariable($name.Trim(), $clean, "Process")
  }
}

Set-Location -LiteralPath $projectRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Không tìm thấy Docker. Hãy cài Docker Desktop và mở Docker trước."
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker CLI đã có nhưng Docker Engine chưa chạy. Hãy mở Docker Desktop rồi chạy lại."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Không tìm thấy Node.js."
}
$nodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 20) {
  throw "BookVerse yêu cầu Node.js 20 trở lên. Phiên bản hiện tại: $(node --version)."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "Không tìm thấy npm đi kèm Node.js."
}

if (-not (Test-Path -LiteralPath $envFile)) {
  $databasePassword = New-HexSecret 18
  $authSecret = New-HexSecret 32
  $content = @"
DATABASE_URL="postgresql://bookverse_demo:$databasePassword@127.0.0.1:5432/bookverse_ai?schema=public"
BOOKVERSE_POSTGRES_USER="bookverse_demo"
BOOKVERSE_POSTGRES_PASSWORD="$databasePassword"
BOOKVERSE_POSTGRES_DB="bookverse_ai"
BOOKVERSE_DOCKER_DATABASE_URL="postgresql://bookverse_demo:$databasePassword@db:5432/bookverse_ai?schema=public"
BOOKVERSE_AI_DATABASE_URL="postgresql://bookverse_demo:$databasePassword@db:5432/bookverse_ai"
BOOKVERSE_BIND_ADDRESS="127.0.0.1"
BOOKVERSE_POSTGRES_PORT="55432"
BOOKVERSE_WEB_PORT="3300"
BOOKVERSE_AI_PORT="8800"
BOOKVERSE_DB_CONTAINER_NAME="bookverse-demo-db"
BOOKVERSE_WEB_CONTAINER_NAME="bookverse-demo-web"
BOOKVERSE_AI_CONTAINER_NAME="bookverse-demo-ai-service"
AUTH_SECRET="$authSecret"
AUTH_TRUST_HOST="true"
BOOKVERSE_SHOW_DEMO_ACCOUNTS="true"
BOOKVERSE_ALLOW_DEMO_CATALOG="true"
NEXT_PUBLIC_APP_URL="http://127.0.0.1:3000"
AI_SERVICE_URL="http://127.0.0.1:8000"
DEMO_DATA_DIR="$($projectRoot.Replace('\', '/'))/data/demo"
BOOKVERSE_CHAT_MOCK_ENABLED="false"
"@
  Set-Content -LiteralPath $envFile -Value $content -Encoding utf8NoBOM
  Write-Host "[OK] Đã tạo .env.demo riêng cho môi trường demo."
} else {
  Write-Host "[OK] Giữ nguyên .env.demo hiện có."
}

Import-DotEnv $envFile

# Môi trường demo luôn dùng tên container và cổng riêng. Các giá trị Process
# này cũng giúp những file .env.demo cũ tiếp tục chạy mà không bị ghi đè.
$demoPostgresPort = "55432"
$env:BOOKVERSE_POSTGRES_PORT = $demoPostgresPort
$env:BOOKVERSE_WEB_PORT = "3300"
$env:BOOKVERSE_AI_PORT = "8800"
$env:BOOKVERSE_DB_CONTAINER_NAME = "bookverse-demo-db"
$env:BOOKVERSE_WEB_CONTAINER_NAME = "bookverse-demo-web"
$env:BOOKVERSE_AI_CONTAINER_NAME = "bookverse-demo-ai-service"
$env:BOOKVERSE_ALLOW_DEMO_CATALOG = "true"
$env:DATABASE_URL = "postgresql://$($env:BOOKVERSE_POSTGRES_USER):$($env:BOOKVERSE_POSTGRES_PASSWORD)@127.0.0.1:$demoPostgresPort/$($env:BOOKVERSE_POSTGRES_DB)?schema=public"

if (-not $SkipInstall) {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci thất bại. Kiểm tra Node.js 20+ và package-lock.json." }
}

docker compose --env-file $envFile -p $composeProject up -d db
if ($LASTEXITCODE -ne 0) { throw "Không thể khởi động PostgreSQL demo." }

$ready = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  docker compose --env-file $envFile -p $composeProject exec -T db `
    pg_isready -U $env:BOOKVERSE_POSTGRES_USER -d $env:BOOKVERSE_POSTGRES_DB *> $null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}
if (-not $ready) { throw "PostgreSQL chưa sẵn sàng sau 30 giây." }

npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate thất bại." }
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy thất bại." }

if (-not $SkipSeed) {
  npm run prisma:seed
  if ($LASTEXITCODE -ne 0) { throw "Seed catalog demo thất bại." }

  npm run content:demo:seed -- --execute --confirm-database=bookverse_ai
  if ($LASTEXITCODE -ne 0) { throw "Seed nội dung đọc demo thất bại." }

  npm run membership:seed-demo
  if ($LASTEXITCODE -ne 0) { throw "Seed hội viên demo thất bại." }

  npm run demo:prepare-reader
  if ($LASTEXITCODE -ne 0) { throw "Chuẩn bị tài khoản đọc demo thất bại." }
}

npm run demo:check
if ($LASTEXITCODE -ne 0) { throw "Dữ liệu demo chưa đạt readiness gate." }

Write-Host ""
Write-Host "BookVerse đã sẵn sàng."
Write-Host "Chạy web và AI service bằng:"
Write-Host "  npm run demo:start"
