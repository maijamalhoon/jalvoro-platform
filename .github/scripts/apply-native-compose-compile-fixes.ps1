$ErrorActionPreference = "Stop"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Update-TextFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][scriptblock]$Transform
    )

    $before = [System.IO.File]::ReadAllText($Path)
    $after = & $Transform $before
    if ($null -eq $after) {
        throw "Transform returned no content for $Path."
    }
    if ($after -ne $before) {
        [System.IO.File]::WriteAllText($Path, $after, $utf8NoBom)
    }
}

function Move-CanvasThemeColorOutsideDrawScope {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$FunctionMarker
    )

    Update-TextFile -Path $Path -Transform {
        param($source)

        $functionIndex = $source.IndexOf($FunctionMarker, [System.StringComparison]::Ordinal)
        if ($functionIndex -lt 0) {
            throw "Could not find function marker '$FunctionMarker' in $Path."
        }

        $canvas = "Canvas(modifier = Modifier.fillMaxSize().padding(12.dp)) {"
        $canvasIndex = $source.IndexOf($canvas, $functionIndex, [System.StringComparison]::Ordinal)
        if ($canvasIndex -lt 0 -or $canvasIndex -gt ($functionIndex + 5000)) {
            throw "Could not find expected navigation Canvas near '$FunctionMarker' in $Path."
        }

        $prefix = $source.Substring(0, $canvasIndex)
        $suffix = $source.Substring($canvasIndex)
        if (-not $prefix.EndsWith("val lineColor = MaterialTheme.colorScheme.onSurface`r`n        ") -and
            -not $prefix.EndsWith("val lineColor = MaterialTheme.colorScheme.onSurface`n        ")) {
            $suffix = "val lineColor = MaterialTheme.colorScheme.onSurface`r`n        " + $suffix
        }

        $first = $suffix.IndexOf("color = MaterialTheme.colorScheme.onSurface,", [System.StringComparison]::Ordinal)
        if ($first -lt 0) {
            return $prefix + $suffix
        }
        $suffix = $suffix.Remove($first, "color = MaterialTheme.colorScheme.onSurface,".Length).Insert($first, "color = lineColor,")

        $second = $suffix.IndexOf("color = MaterialTheme.colorScheme.onSurface,", $first + "color = lineColor,".Length, [System.StringComparison]::Ordinal)
        if ($second -lt 0) {
            throw "Expected a second Canvas theme-color read near '$FunctionMarker' in $Path."
        }
        $suffix = $suffix.Remove($second, "color = MaterialTheme.colorScheme.onSurface,".Length).Insert($second, "color = lineColor,")

        return $prefix + $suffix
    }
}

$uiRoot = Join-Path $env:GITHUB_WORKSPACE "native\androidApp\src\main\kotlin\com\jamalsfinance\nativeapp\ui"

Move-CanvasThemeColorOutsideDrawScope `
    -Path (Join-Path $uiRoot "JalvoroOverviewDashboard.kt") `
    -FunctionMarker "private fun OverviewFloatingMenuButton"

Move-CanvasThemeColorOutsideDrawScope `
    -Path (Join-Path $uiRoot "JalvoroWebsiteWorkspaceShell.kt") `
    -FunctionMarker "private fun JalvoroWebsiteFloatingHeader"

Update-TextFile -Path (Join-Path $uiRoot "JalvoroWebsiteUtilityShell.kt") -Transform {
    param($source)
    return $source.Replace("import androidx.compose.foundation.layout.weight`r`n", "").Replace("import androidx.compose.foundation.layout.weight`n", "")
}

Write-Host "Targeted native Compose compile fixes are applied."
