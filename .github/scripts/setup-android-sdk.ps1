param(
    [string]$SdkRoot = "C:\Android\Sdk",
    [string]$CommandLineToolsRevision = "14742923"
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if ($env:GITHUB_WORKSPACE) {
    $workspace = $env:GITHUB_WORKSPACE
} else {
    $workspace = (Get-Location).Path
}

$logPath = Join-Path $workspace "native\android-sdk-setup.log"
New-Item -ItemType Directory -Force -Path (Split-Path $logPath -Parent) | Out-Null
Set-Content -Path $logPath -Value "Android SDK setup started" -Encoding UTF8

function Write-SetupLog {
    param([string]$Message)
    $line = "$(Get-Date -Format o) $Message"
    Write-Host $line
    Add-Content -Path $logPath -Value $line -Encoding UTF8
}

try {
    Write-SetupLog "Stage: prepare Android SDK directories"
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

        Write-SetupLog "Stage: download Android command-line tools revision $CommandLineToolsRevision"
        Invoke-WebRequest -UseBasicParsing -Uri $downloadUrl -OutFile $archive

        Write-SetupLog "Stage: extract Android command-line tools"
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

    Write-SetupLog "Stage: export Android SDK environment"
    $env:ANDROID_HOME = $SdkRoot
    $env:ANDROID_SDK_ROOT = $SdkRoot

    if ($env:GITHUB_ENV) {
        "ANDROID_HOME=$SdkRoot" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
        "ANDROID_SDK_ROOT=$SdkRoot" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
    }
    if ($env:GITHUB_PATH) {
        (Join-Path $SdkRoot "cmdline-tools\latest\bin") | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
        (Join-Path $SdkRoot "platform-tools") | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
    }

    Write-SetupLog "Stage: accept Android SDK licenses"
    $licenseCommand = "(for /L %i in (1,1,100) do @echo y) | `"$sdkManager`" --sdk_root=`"$SdkRoot`" --licenses"
    & cmd.exe /d /s /c $licenseCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Android SDK license acceptance failed with exit code $LASTEXITCODE."
    }

    Write-SetupLog "Stage: install Android SDK packages"
    & $sdkManager "--sdk_root=$SdkRoot" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
    if ($LASTEXITCODE -ne 0) {
        throw "Android SDK package installation failed with exit code $LASTEXITCODE."
    }

    Write-SetupLog "Stage: verify Android SDK packages"
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

    Write-SetupLog "Android SDK ready at $SdkRoot"
    & $sdkManager "--sdk_root=$SdkRoot" --version
}
catch {
    Write-SetupLog "ERROR: $($_.Exception.Message)"
    Write-Error ($_ | Out-String)
    throw
}
