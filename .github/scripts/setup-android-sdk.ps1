param(
    [string]$SdkRoot = "C:\Android\Sdk",
    [string]$CommandLineToolsRevision = "15859902"
)

$ErrorActionPreference = "Stop"

$cmdlineToolsRoot = Join-Path $SdkRoot "cmdline-tools\latest"
$sdkManager = Join-Path $cmdlineToolsRoot "bin\sdkmanager.bat"

if (-not (Test-Path $sdkManager)) {
    $archive = Join-Path $env:RUNNER_TEMP "commandlinetools-win-$CommandLineToolsRevision.zip"
    $extractRoot = Join-Path $env:RUNNER_TEMP "android-command-line-tools-$CommandLineToolsRevision"
    $downloadUrl = "https://dl.google.com/android/repository/commandlinetools-win-$($CommandLineToolsRevision)_latest.zip"

    Remove-Item $archive -Force -ErrorAction SilentlyContinue
    Remove-Item $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $cmdlineToolsRoot -Recurse -Force -ErrorAction SilentlyContinue

    New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null
    New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
    New-Item -ItemType Directory -Force -Path $cmdlineToolsRoot | Out-Null

    Write-Host "Downloading Android command-line tools revision $CommandLineToolsRevision..."
    Invoke-WebRequest -Uri $downloadUrl -OutFile $archive
    Expand-Archive -Path $archive -DestinationPath $extractRoot -Force

    $extractedTools = Join-Path $extractRoot "cmdline-tools"
    if (-not (Test-Path $extractedTools)) {
        throw "Android command-line tools archive did not contain the expected cmdline-tools directory."
    }

    Copy-Item -Path (Join-Path $extractedTools "*") -Destination $cmdlineToolsRoot -Recurse -Force
}

if (-not (Test-Path $sdkManager)) {
    throw "sdkmanager was not installed at $sdkManager."
}

$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot

"ANDROID_HOME=$SdkRoot" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
"ANDROID_SDK_ROOT=$SdkRoot" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
(Join-Path $SdkRoot "cmdline-tools\latest\bin") | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
(Join-Path $SdkRoot "platform-tools") | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append

$licenseInput = ((1..100) | ForEach-Object { "y" }) -join [Environment]::NewLine
$licenseInput | & $sdkManager "--sdk_root=$SdkRoot" --licenses | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "Android SDK license acceptance failed with exit code $LASTEXITCODE."
}

& $sdkManager "--sdk_root=$SdkRoot" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
if ($LASTEXITCODE -ne 0) {
    throw "Android SDK package installation failed with exit code $LASTEXITCODE."
}

$requiredPaths = @(
    (Join-Path $SdkRoot "platform-tools\adb.exe"),
    (Join-Path $SdkRoot "platforms\android-36\android.jar"),
    (Join-Path $SdkRoot "build-tools\36.0.0\aapt2.exe")
)

foreach ($path in $requiredPaths) {
    if (-not (Test-Path $path)) {
        throw "Required Android SDK component was not installed: $path"
    }
}

Write-Host "Android SDK ready at $SdkRoot"
& $sdkManager "--sdk_root=$SdkRoot" --version
