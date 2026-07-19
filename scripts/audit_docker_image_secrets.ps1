param(
  [string[]]$Images = @("bookverse-web:g2-1-local", "bookverse-ai:g2-1-local")
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$environmentPath = Join-Path $repositoryRoot ".env"

if (-not (Test-Path -LiteralPath $environmentPath)) {
  throw "BLOCKED_MISSING_ENV_FILE: Không có .env để tạo tập secret cần so khớp."
}

# Chỉ giữ các giá trị nhạy cảm đủ dài. Báo cáo không bao giờ in giá trị thật.
$knownSecrets = @()
foreach ($line in Get-Content -LiteralPath $environmentPath) {
  if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#") -or -not $line.Contains("=")) {
    continue
  }

  $name, $rawValue = $line.Split("=", 2)
  $name = $name.Trim()
  $value = $rawValue.Trim().Trim('"').Trim("'")
  if ($name -match "(?i)(SECRET|PASSWORD|API_KEY|DATABASE_URL|TOKEN)" -and $value.Length -ge 8) {
    $knownSecrets += [pscustomobject]@{ Name = $name; Value = $value }
  }
}

if ($knownSecrets.Count -eq 0) {
  throw "BLOCKED_NO_SECRET_CANDIDATES: Không tìm thấy giá trị nhạy cảm đủ điều kiện để quét."
}

$findings = @()
$scannedImages = @()

foreach ($image in $Images) {
  $inspectText = (& docker image inspect $image 2>&1 | Out-String)
  if ($LASTEXITCODE -ne 0) {
    throw "FAILED_IMAGE_INSPECT: $image"
  }

  $inspect = ($inspectText | ConvertFrom-Json)[0]
  $historyText = (& docker history --no-trunc --format "{{.CreatedBy}}" $image 2>&1 | Out-String)
  if ($LASTEXITCODE -ne 0) {
    throw "FAILED_IMAGE_HISTORY: $image"
  }

  foreach ($entry in @($inspect.Config.Env)) {
    $variableName = ($entry -split "=", 2)[0]
    if ($variableName -match "(?i)(SECRET|PASSWORD|API_KEY|DATABASE_URL|TOKEN)") {
      $findings += [pscustomobject]@{ Image = $image; Candidate = $variableName; Location = "CONFIG_ENV" }
    }
  }

  foreach ($candidate in $knownSecrets) {
    if ($inspectText.Contains($candidate.Value)) {
      $findings += [pscustomobject]@{ Image = $image; Candidate = $candidate.Name; Location = "IMAGE_CONFIG" }
    }
    if ($historyText.Contains($candidate.Value)) {
      $findings += [pscustomobject]@{ Image = $image; Candidate = $candidate.Name; Location = "BUILD_HISTORY" }
    }
  }

  $safeName = ($image -replace "[^a-zA-Z0-9_.-]", "-")
  $containerName = "bookverse-g2-1-secret-scan-$safeName-$PID"
  $tarPath = Join-Path $repositoryRoot ".tmp-$safeName-$PID.tar"
  $containerId = $null

  try {
    $containerId = (& docker create --name $containerName $image 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerId)) {
      throw "FAILED_CONTAINER_CREATE: $image"
    }

    & docker export --output $tarPath $containerId | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $tarPath)) {
      throw "FAILED_CONTAINER_EXPORT: $image"
    }

    foreach ($candidate in $knownSecrets) {
      & rg --text --fixed-strings --quiet -- $candidate.Value $tarPath
      if ($LASTEXITCODE -eq 0) {
        $findings += [pscustomobject]@{ Image = $image; Candidate = $candidate.Name; Location = "FILESYSTEM_LAYER" }
      } elseif ($LASTEXITCODE -ne 1) {
        throw "FAILED_FILESYSTEM_SCAN: $image/$($candidate.Name)"
      }
    }
  } finally {
    if ($containerId) {
      & docker rm --force $containerId | Out-Null
    }
    if (Test-Path -LiteralPath $tarPath) {
      # Đây là đúng một file tạm nằm trực tiếp trong repository, không xóa đệ quy.
      Remove-Item -LiteralPath $tarPath -Force
    }
  }

  $scannedImages += [pscustomobject]@{ Image = $image; Id = $inspect.Id }
}

$report = [ordered]@{
  Status = if ($findings.Count -eq 0) { "VERIFIED" } else { "FAILED" }
  CheckedAt = (Get-Date).ToUniversalTime().ToString("o")
  CandidateCount = $knownSecrets.Count
  Images = $scannedImages
  FindingCount = $findings.Count
  Findings = $findings
  Scope = @("IMAGE_CONFIG", "BUILD_HISTORY", "FILESYSTEM_LAYER")
}

$report | ConvertTo-Json -Depth 6
if ($findings.Count -gt 0) {
  exit 1
}
