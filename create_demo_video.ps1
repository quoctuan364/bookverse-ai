Add-Type -AssemblyName System.Drawing

$frameFiles = Get-ChildItem -Path "$PSScriptRoot\actual_demo_frames_run2" -Filter '*.jpg' | Sort-Object Name
if ($frameFiles.Count -eq 0) { throw 'Không tìm thấy ảnh khung hình demo.' }

$output = Join-Path $PSScriptRoot 'BookVerse_AI_Demo_ThaoTac_That_KhongAmThanh.avi'
$width = 960
$height = 540
$fps = 2
$holdSeconds = 1
$copies = $fps * $holdSeconds
$rowBytes = [int][Math]::Ceiling(($width * 3) / 4.0) * 4
$frameBytes = $rowBytes * $height
$frameCount = $frameFiles.Count * $copies

function Write-FourCC([System.IO.BinaryWriter]$writer, [string]$value) {
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes($value))
}

function Write-Frame([System.IO.BinaryWriter]$writer, [string]$path) {
    $source = [System.Drawing.Bitmap]::FromFile($path)
    $canvas = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($source, 0, 0, $width, $height)
    $graphics.Dispose(); $source.Dispose()

    $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $data = $canvas.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $raw = New-Object byte[] ($data.Stride * $height)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $raw, 0, $raw.Length)
    $canvas.UnlockBits($data); $canvas.Dispose()

    # AVI/DIB lưu từ dòng dưới lên; đệm từng dòng đến bội số 4 byte.
    $result = New-Object byte[] $frameBytes
    for ($y = 0; $y -lt $height; $y++) {
        [Array]::Copy($raw, ($height - 1 - $y) * $data.Stride, $result, $y * $rowBytes, $width * 3)
    }
    Write-FourCC $writer '00db'; $writer.Write([uint32]$frameBytes); $writer.Write($result)
}

$stream = [System.IO.File]::Open($output, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
$writer = New-Object System.IO.BinaryWriter($stream)
try {
    # RIFF/AVI header
    Write-FourCC $writer 'RIFF'; $riffSizeAt = $stream.Position; $writer.Write([uint32]0); Write-FourCC $writer 'AVI '
    Write-FourCC $writer 'LIST'; $hdrlSizeAt = $stream.Position; $writer.Write([uint32]0); Write-FourCC $writer 'hdrl'
    Write-FourCC $writer 'avih'; $writer.Write([uint32]56)
    $writer.Write([uint32](1000000 / $fps)); $writer.Write([uint32]($frameBytes * $fps)); $writer.Write([uint32]0)
    $writer.Write([uint32]0x10); $writer.Write([uint32]$frameCount); $writer.Write([uint32]0); $writer.Write([uint32]1)
    $writer.Write([uint32]$frameBytes); $writer.Write([uint32]$width); $writer.Write([uint32]$height)
    1..4 | ForEach-Object { $writer.Write([uint32]0) }
    Write-FourCC $writer 'LIST'; $strlSizeAt = $stream.Position; $writer.Write([uint32]0); Write-FourCC $writer 'strl'
    Write-FourCC $writer 'strh'; $writer.Write([uint32]56); Write-FourCC $writer 'vids'; Write-FourCC $writer 'DIB '
    $writer.Write([uint32]0); $writer.Write([uint16]0); $writer.Write([uint16]0); $writer.Write([uint32]0)
    $writer.Write([uint32]1); $writer.Write([uint32]$fps); $writer.Write([uint32]0); $writer.Write([uint32]$frameCount)
    $writer.Write([uint32]$frameBytes); $writer.Write([uint32]::MaxValue); $writer.Write([uint32]0)
    $writer.Write([int16]0); $writer.Write([int16]0); $writer.Write([int16]$width); $writer.Write([int16]$height)
    Write-FourCC $writer 'strf'; $writer.Write([uint32]40); $writer.Write([uint32]40); $writer.Write([int32]$width); $writer.Write([int32]$height)
    $writer.Write([uint16]1); $writer.Write([uint16]24); $writer.Write([uint32]0); $writer.Write([uint32]$frameBytes)
    $writer.Write([int32]0); $writer.Write([int32]0); $writer.Write([uint32]0); $writer.Write([uint32]0)
    $hdrlEnd = $stream.Position; $stream.Position = $strlSizeAt; $writer.Write([uint32]($hdrlEnd - $strlSizeAt - 4)); $stream.Position = $hdrlSizeAt; $writer.Write([uint32]($hdrlEnd - $hdrlSizeAt - 4)); $stream.Position = $hdrlEnd
    Write-FourCC $writer 'LIST'; $moviSizeAt = $stream.Position; $writer.Write([uint32]0); Write-FourCC $writer 'movi'; $moviDataStart = $stream.Position
    $index = @()
    foreach ($file in $frameFiles) {
        for ($i = 0; $i -lt $copies; $i++) { $index += [pscustomobject]@{ Offset = $stream.Position - $moviDataStart; Size = $frameBytes }; Write-Frame $writer $file.FullName }
    }
    $moviEnd = $stream.Position; $stream.Position = $moviSizeAt; $writer.Write([uint32]($moviEnd - $moviSizeAt - 4)); $stream.Position = $moviEnd
    Write-FourCC $writer 'idx1'; $writer.Write([uint32]($index.Count * 16))
    foreach ($item in $index) { Write-FourCC $writer '00db'; $writer.Write([uint32]0x10); $writer.Write([uint32]$item.Offset); $writer.Write([uint32]$item.Size) }
    $riffEnd = $stream.Position; $stream.Position = $riffSizeAt; $writer.Write([uint32]($riffEnd - $riffSizeAt - 4))
} finally { $writer.Dispose(); $stream.Dispose() }

Write-Output "Đã tạo video: $output"
