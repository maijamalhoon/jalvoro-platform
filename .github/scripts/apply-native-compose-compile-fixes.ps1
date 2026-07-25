$ErrorActionPreference = "Stop"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Lines {
    param([string]$Path)
    $lines = New-Object 'System.Collections.Generic.List[string]'
    $lines.AddRange([System.IO.File]::ReadAllLines($Path))
    return ,$lines
}

function Find-LineIndex {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [string]$Text,
        [int]$StartIndex = 0
    )
    for ($index = $StartIndex; $index -lt $Lines.Count; $index++) {
        if ($Lines[$index].Contains($Text)) {
            return $index
        }
    }
    return -1
}

function Fix-CanvasThemeColor {
    param(
        [string]$Path,
        [string]$FunctionMarker
    )

    $lines = Read-Lines $Path
    $functionIndex = Find-LineIndex -Lines $lines -Text $FunctionMarker
    if ($functionIndex -lt 0) {
        throw "Could not find function marker '$FunctionMarker' in $Path."
    }

    $canvasIndex = Find-LineIndex -Lines $lines -Text "Canvas(modifier = Modifier.fillMaxSize().padding(12.dp))" -StartIndex $functionIndex
    if ($canvasIndex -lt 0 -or $canvasIndex -gt ($functionIndex + 80)) {
        throw "Could not find the expected navigation Canvas near '$FunctionMarker' in $Path."
    }

    if ($canvasIndex -gt 0 -and $lines[$canvasIndex - 1].Contains("val lineColor = MaterialTheme.colorScheme.onSurface")) {
        return
    }

    $canvasIndent = [regex]::Match($lines[$canvasIndex], '^\s*').Value
    $lines.Insert($canvasIndex, "${canvasIndent}val lineColor = MaterialTheme.colorScheme.onSurface")
    $canvasIndex++

    $replaced = 0
    $limit = [Math]::Min($lines.Count, $canvasIndex + 40)
    for ($index = $canvasIndex + 1; $index -lt $limit; $index++) {
        if ($lines[$index].Trim() -eq "color = MaterialTheme.colorScheme.onSurface,") {
            $indent = [regex]::Match($lines[$index], '^\s*').Value
            $lines[$index] = "${indent}color = lineColor,"
            $replaced++
            if ($replaced -eq 2) {
                break
            }
        }
    }

    if ($replaced -ne 2) {
        throw "Expected to replace two Canvas theme-color reads near '$FunctionMarker' in $Path; replaced $replaced."
    }

    [System.IO.File]::WriteAllLines($Path, $lines, $utf8NoBom)
}

function Remove-ExactLine {
    param(
        [string]$Path,
        [string]$LineToRemove
    )

    $source = [System.IO.File]::ReadAllLines($Path)
    $filtered = @($source | Where-Object { $_ -ne $LineToRemove })
    if ($filtered.Count -eq $source.Count) {
        return
    }
    [System.IO.File]::WriteAllLines($Path, $filtered, $utf8NoBom)
}

$uiRoot = Join-Path $env:GITHUB_WORKSPACE "native\androidApp\src\main\kotlin\com\jamalsfinance\nativeapp\ui"

Fix-CanvasThemeColor `
    -Path (Join-Path $uiRoot "JalvoroOverviewDashboard.kt") `
    -FunctionMarker "private fun OverviewFloatingMenuButton"

Fix-CanvasThemeColor `
    -Path (Join-Path $uiRoot "JalvoroWebsiteWorkspaceShell.kt") `
    -FunctionMarker "private fun JalvoroWebsiteFloatingHeader"

Remove-ExactLine `
    -Path (Join-Path $uiRoot "JalvoroWebsiteUtilityShell.kt") `
    -LineToRemove "import androidx.compose.foundation.layout.weight"

Write-Host "Targeted native Compose compile fixes are applied."
