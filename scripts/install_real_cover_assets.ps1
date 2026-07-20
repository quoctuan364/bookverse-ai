param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ArchivePath,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Fa-f0-9]{64}$')]
    [string]$ExpectedSha256,

    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$archive = (Resolve-Path -LiteralPath $ArchivePath).Path
$actualSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
if ($actualSha256 -ne $ExpectedSha256.ToLowerInvariant()) {
    throw "ARCHIVE_SHA256_MISMATCH expected=$ExpectedSha256 actual=$actualSha256"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$installId = [Guid]::NewGuid().ToString('N')
$stagingRoot = Join-Path $ProjectRoot (Join-Path '.runtime' "cover-asset-install-$installId")
$extractRoot = Join-Path $stagingRoot 'package'
New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null

function Assert-SafeZipEntry([string]$name) {
    $normalized = $name.Replace('\', '/')
    if ($normalized.StartsWith('/') -or $normalized -match '^[A-Za-z]:/' -or $normalized.Split('/') -contains '..') {
        throw "ZIP_PATH_TRAVERSAL:$name"
    }
    if ($normalized -match '(^|/)\.\.?(?:/|$)') {
        throw "ZIP_DOT_PATH:$name"
    }
}

$zip = [IO.Compression.ZipFile]::OpenRead($archive)
try {
    foreach ($entry in $zip.Entries) {
        Assert-SafeZipEntry $entry.FullName
        if ($entry.FullName.EndsWith('/')) { continue }
        $destination = Join-Path $extractRoot $entry.FullName
        $destinationParent = Split-Path -Parent $destination
        New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $false)
    }
}
finally {
    $zip.Dispose()
}

$packageRoot = Join-Path $extractRoot 'real-cover-assets'
if (-not (Test-Path -LiteralPath (Join-Path $packageRoot 'cover-manifest-3046.json') -PathType Leaf)) {
    throw 'PACKAGE_MANIFEST_MISSING'
}
$checksumManifest = Join-Path $packageRoot 'checksums.sha256'
if (-not (Test-Path -LiteralPath $checksumManifest -PathType Leaf)) {
    throw 'PACKAGE_CHECKSUM_MANIFEST_MISSING'
}

foreach ($line in Get-Content -LiteralPath $checksumManifest) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -notmatch '^([A-Fa-f0-9]{64})\s+\*?(.+)$') {
        throw "CHECKSUM_LINE_INVALID:$line"
    }
    $expected = $Matches[1].ToLowerInvariant()
    $relative = $Matches[2].Replace('/', '\')
    $file = Join-Path $packageRoot $relative
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "PACKAGE_FILE_MISSING:$relative" }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw "PACKAGE_FILE_CHECKSUM_MISMATCH:$relative" }
}

$copyRoots = @(
    @{ Relative = 'public\covers\real-catalog-local'; Destination = Join-Path $ProjectRoot 'public\covers\real-catalog-local' },
    @{ Relative = 'public\covers\real-catalog-local-normalized'; Destination = Join-Path $ProjectRoot 'public\covers\real-catalog-local-normalized' }
)
$copied = 0
$skipped = 0
foreach ($root in $copyRoots) {
    $sourceRoot = Join-Path $packageRoot $root.Relative
    if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) { continue }
    New-Item -ItemType Directory -Path $root.Destination -Force | Out-Null
    foreach ($sourceFile in Get-ChildItem -LiteralPath $sourceRoot -File) {
        $destination = Join-Path $root.Destination $sourceFile.Name
        if (Test-Path -LiteralPath $destination -PathType Leaf) {
            $existingHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash
            $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sourceFile.FullName).Hash
            if ($existingHash -eq $sourceHash) { $skipped++; continue }
            if (-not $Force) { throw "DESTINATION_CHECKSUM_MISMATCH_USE_FORCE:$destination" }
        }
        Copy-Item -LiteralPath $sourceFile.FullName -Destination $destination -Force:$Force
        $copied++
    }
}

$oldPackRoot = $env:REAL_COVER_PACK_DIR
$env:REAL_COVER_PACK_DIR = $packageRoot
try {
    npm run covers:validate-local-pack
    if ($LASTEXITCODE -ne 0) { throw "VALIDATOR_FAILED_EXIT_$LASTEXITCODE" }
}
finally {
    if ($null -eq $oldPackRoot) { Remove-Item Env:REAL_COVER_PACK_DIR -ErrorAction SilentlyContinue }
    else { $env:REAL_COVER_PACK_DIR = $oldPackRoot }
}

[pscustomobject]@{
    status = 'VERIFIED'
    archiveSha256 = $actualSha256
    copied = $copied
    skippedExistingSameChecksum = $skipped
    rightsStatus = 'RIGHTS_NOT_VERIFIED'
    databaseAccess = 'NONE'
} | ConvertTo-Json
