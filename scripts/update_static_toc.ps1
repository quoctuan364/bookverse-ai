param(
    [Parameter(Mandatory = $true)]
    [string]$DocumentPath
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null

try {
    $document = $word.Documents.Open($DocumentPath, $false, $false)
    $document.Repaginate()

    $paragraphs = $document.Paragraphs
    $tocStart = -1
    $bodyStart = -1

    for ($index = 1; $index -le $paragraphs.Count; $index++) {
        $text = $paragraphs.Item($index).Range.Text.Trim("`r", "`n", " ")
        if ($tocStart -lt 0 -and $text -eq 'MỤC LỤC') {
            $tocStart = $index
            continue
        }
        if ($tocStart -gt 0 -and $text -eq 'CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN') {
            $bodyStart = $index
            break
        }
    }

    if ($tocStart -lt 0 -or $bodyStart -lt 0) {
        throw 'Không xác định được vùng mục lục hoặc phần nội dung chính.'
    }

    # Chỉ lấy số trang cho các tiêu đề thật sự xuất hiện trong mục lục.
    # Cách này giảm mạnh số lần gọi COM so với duyệt Information của mọi đoạn.
    $tocLabels = New-Object 'System.Collections.Generic.HashSet[string]'
    for ($index = $tocStart + 1; $index -lt $bodyStart; $index++) {
        $raw = $paragraphs.Item($index).Range.Text.Trim("`r", "`n")
        if ($raw -match '^(.*?)(\t+|\.{3,}|\s{4,})(\d+)\s*$') {
            [void]$tocLabels.Add($matches[1].Trim())
        }
    }

    $bodyPages = @{}
    for ($index = $bodyStart; $index -le $paragraphs.Count; $index++) {
        $range = $paragraphs.Item($index).Range
        $text = $range.Text.Trim("`r", "`n", " ")
        if (-not $tocLabels.Contains($text) -or $bodyPages.ContainsKey($text)) { continue }
        try {
            # wdActiveEndAdjustedPageNumber = 1
            $bodyPages[$text] = $range.Information(1)
        }
        catch { continue }
    }

    $updated = 0
    $unresolved = New-Object System.Collections.Generic.List[string]
    for ($index = $tocStart + 1; $index -lt $bodyStart; $index++) {
        $paragraph = $paragraphs.Item($index)
        $range = $paragraph.Range
        $raw = $range.Text.Trim("`r", "`n")
        if ($raw -notmatch '^(.*?)(\t+|\.{3,}|\s{4,})(\d+)\s*$') { continue }

        $label = $matches[1].Trim()
        $page = if ($bodyPages.ContainsKey($label)) { $bodyPages[$label] } else { $null }

        if ($null -eq $page) {
            $unresolved.Add($label)
            continue
        }

        $replacement = [regex]::Replace($raw, '(\d+)\s*$', [string]$page)
        $writeRange = $paragraph.Range.Duplicate
        $writeRange.End = $writeRange.End - 1
        $writeRange.Text = $replacement
        $updated++
    }

    $document.Repaginate()
    foreach ($story in $document.StoryRanges) {
        try { $story.Fields.Update() | Out-Null } catch { }
    }
    $document.Save()
    Write-Output "TOC_UPDATED=$updated"
    Write-Output "TOC_UNRESOLVED=$($unresolved.Count)"
    foreach ($item in $unresolved) { Write-Output "UNRESOLVED: $item" }
    Write-Output "PAGES=$($document.ComputeStatistics(2))"
}
finally {
    if ($null -ne $document) {
        try { $document.Close($false) } catch { }
    }
    try { $word.Quit() } catch { }
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null } catch { }
}
