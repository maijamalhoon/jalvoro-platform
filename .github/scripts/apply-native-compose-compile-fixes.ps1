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

function Native-Newlines {
    param(
        [Parameter(Mandatory = $true)][string]$Template,
        [Parameter(Mandatory = $true)][string]$Source
    )

    $newline = if ($Source.Contains("`r`n")) { "`r`n" } else { "`n" }
    return $Template.Replace("`r`n", "`n").Replace("`n", $newline)
}

function Replace-RequiredBlock {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$OldBlock,
        [Parameter(Mandatory = $true)][string]$NewBlock,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $oldNative = Native-Newlines -Template $OldBlock -Source $Source
    $newNative = Native-Newlines -Template $NewBlock -Source $Source
    if ($Source.Contains($newNative)) {
        return $Source
    }
    if (-not $Source.Contains($oldNative)) {
        throw "Could not find expected block: $Label"
    }
    return $Source.Replace($oldNative, $newNative)
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
        $newline = if ($source.Contains("`r`n")) { "`r`n" } else { "`n" }
        if (-not $prefix.EndsWith("val lineColor = MaterialTheme.colorScheme.onSurface${newline}        ")) {
            $suffix = "val lineColor = MaterialTheme.colorScheme.onSurface${newline}        " + $suffix
        }

        $themeColor = "color = MaterialTheme.colorScheme.onSurface,"
        $first = $suffix.IndexOf($themeColor, [System.StringComparison]::Ordinal)
        if ($first -ge 0) {
            $suffix = $suffix.Remove($first, $themeColor.Length).Insert($first, "color = lineColor,")
            $second = $suffix.IndexOf($themeColor, $first + "color = lineColor,".Length, [System.StringComparison]::Ordinal)
            if ($second -lt 0) {
                throw "Expected a second Canvas theme-color read near '$FunctionMarker' in $Path."
            }
            $suffix = $suffix.Remove($second, $themeColor.Length).Insert($second, "color = lineColor,")
        }

        return $prefix + $suffix
    }
}

function Apply-WorkspaceDrawerParity {
    param([Parameter(Mandatory = $true)][string]$Path)

    Update-TextFile -Path $Path -Transform {
        param($source)

        $newline = if ($source.Contains("`r`n")) { "`r`n" } else { "`n" }
        if (-not $source.Contains("import androidx.compose.foundation.layout.heightIn")) {
            $anchor = "import androidx.compose.foundation.layout.fillMaxWidth${newline}"
            $source = $source.Replace($anchor, $anchor + "import androidx.compose.foundation.layout.heightIn${newline}")
        }

        $oldBlock = @'
            JalvoroWebsiteDrawer(
                email = email,
                selected = selected,
'@
        $newBlock = @'
            JalvoroWebsiteDrawer(
                email = email,
                selected = selected,
                onClose = { scope.launch { drawerState.close() } },
'@
        $source = Replace-RequiredBlock -Source $source -OldBlock $oldBlock -NewBlock $newBlock -Label "drawer close callback"

        $oldBlock = @'
private fun JalvoroWebsiteDrawer(
    email: String,
    selected: JalvoroWebsiteDestination,
    onOverview: () -> Unit,
'@
        $newBlock = @'
private fun JalvoroWebsiteDrawer(
    email: String,
    selected: JalvoroWebsiteDestination,
    onClose: () -> Unit,
    onOverview: () -> Unit,
'@
        $source = Replace-RequiredBlock -Source $source -OldBlock $oldBlock -NewBlock $newBlock -Label "drawer close parameter"

        $oldBlock = @'
            JalvoroWebsiteBrandLockup(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 18.dp, vertical = 16.dp),
                compact = true,
            )
'@
        $newBlock = @'
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                JalvoroWebsiteBrandLockup(
                    modifier = Modifier.weight(1f),
                    compact = true,
                )
                Surface(
                    onClick = onClose,
                    modifier = Modifier.size(40.dp).semantics {
                        contentDescription = "Close navigation menu"
                    },
                    shape = RoundedCornerShape(13.dp),
                    color = Color.Transparent,
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = JalvoroIcons.Close,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
            }
'@
        $source = Replace-RequiredBlock -Source $source -OldBlock $oldBlock -NewBlock $newBlock -Label "website drawer header"

        $oldBlock = @'
                workspaceItems.forEach { item ->
                    item(key = item.destination.name) {
                        JalvoroWebsiteDrawerItem(
                            item = item,
                            selected = selected == item.destination,
                        )
                    }
                }
'@
        $newBlock = @'
                workspaceItems.chunked(2).forEachIndexed { rowIndex, rowItems ->
                    item(key = "workspace-$rowIndex") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            rowItems.forEach { item ->
                                JalvoroWebsiteDrawerItem(
                                    item = item,
                                    selected = selected == item.destination,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (rowItems.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
'@
        $source = Replace-RequiredBlock -Source $source -OldBlock $oldBlock -NewBlock $newBlock -Label "workspace navigation grid"

        $oldBlock = @'
                accountItems.forEach { item ->
                    item(key = item.destination.name) {
                        JalvoroWebsiteDrawerItem(
                            item = item,
                            selected = selected == item.destination,
                        )
                    }
                }
'@
        $newBlock = @'
                accountItems.chunked(2).forEachIndexed { rowIndex, rowItems ->
                    item(key = "account-$rowIndex") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            rowItems.forEach { item ->
                                JalvoroWebsiteDrawerItem(
                                    item = item,
                                    selected = selected == item.destination,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            if (rowItems.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
'@
        $source = Replace-RequiredBlock -Source $source -OldBlock $oldBlock -NewBlock $newBlock -Label "account navigation grid"

        $oldBlock = @'
private fun JalvoroWebsiteDrawerItem(
    item: JalvoroWebsiteNavigationItem,
    selected: Boolean,
) {
    NavigationDrawerItem(
        label = { Text(item.label, fontWeight = FontWeight.Bold) },
'@
        $newBlock = @'
private fun JalvoroWebsiteDrawerItem(
    item: JalvoroWebsiteNavigationItem,
    selected: Boolean,
    modifier: Modifier = Modifier,
) {
    NavigationDrawerItem(
        label = {
            Text(
                text = item.label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
'@
        $source = Replace-RequiredBlock -Source $source -OldBlock $oldBlock -NewBlock $newBlock -Label "drawer item signature and label"

        $source = $source.Replace(
            "color = if (selected) Color.White.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surface,",
            "color = if (selected) Color.White.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surfaceContainer,"
        )
        $source = $source.Replace(
            "modifier = Modifier.fillMaxWidth(),${newline}        shape = RoundedCornerShape(14.dp),",
            "modifier = modifier.fillMaxWidth().heightIn(min = 52.dp),${newline}        shape = RoundedCornerShape(14.dp),"
        )
        $source = $source.Replace(
            "unselectedContainerColor = Color.Transparent,",
            "unselectedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow.copy(alpha = 0.78f),"
        )

        return $source
    }
}

$uiRoot = Join-Path $env:GITHUB_WORKSPACE "native\androidApp\src\main\kotlin\com\jamalsfinance\nativeapp\ui"

Move-CanvasThemeColorOutsideDrawScope `
    -Path (Join-Path $uiRoot "JalvoroOverviewDashboard.kt") `
    -FunctionMarker "private fun OverviewFloatingMenuButton"

Move-CanvasThemeColorOutsideDrawScope `
    -Path (Join-Path $uiRoot "JalvoroWebsiteWorkspaceShell.kt") `
    -FunctionMarker "private fun JalvoroWebsiteFloatingHeader"

Apply-WorkspaceDrawerParity -Path (Join-Path $uiRoot "JalvoroWebsiteWorkspaceShell.kt")

Update-TextFile -Path (Join-Path $uiRoot "JalvoroWebsiteUtilityShell.kt") -Transform {
    param($source)
    return $source.Replace("import androidx.compose.foundation.layout.weight`r`n", "").Replace("import androidx.compose.foundation.layout.weight`n", "")
}

Write-Host "Targeted Compose fixes and website drawer parity polish are applied."
