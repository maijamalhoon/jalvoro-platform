@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SDK_ROOT=C:\Android\Sdk"
set "TOOLS_REVISION=14742923"
set "TOOLS_URL=https://dl.google.com/android/repository/commandlinetools-win-%TOOLS_REVISION%_latest.zip"
set "ARCHIVE=%RUNNER_TEMP%\commandlinetools-win-%TOOLS_REVISION%.zip"
set "EXTRACT_ROOT=%RUNNER_TEMP%\android-command-line-tools-%TOOLS_REVISION%"
set "SDK_MANAGER=%SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat"
set "LICENSE_INPUT=%RUNNER_TEMP%\android-sdk-license-input.txt"
set "SETUP_LOG=%GITHUB_WORKSPACE%\native\android-sdk-setup.log"

>"%SETUP_LOG%" echo Android SDK setup started
call :log Stage: prepare Android SDK directories

if exist "%SDK_MANAGER%" goto tools_ready

if exist "%ARCHIVE%" del /f /q "%ARCHIVE%"
if exist "%EXTRACT_ROOT%" rmdir /s /q "%EXTRACT_ROOT%"
if exist "%SDK_ROOT%\cmdline-tools\latest" rmdir /s /q "%SDK_ROOT%\cmdline-tools\latest"

mkdir "%EXTRACT_ROOT%" 2>nul
mkdir "%SDK_ROOT%\cmdline-tools\latest" 2>nul

call :log Stage: download Android command-line tools revision %TOOLS_REVISION%
curl.exe -fL --retry 3 --retry-delay 2 -o "%ARCHIVE%" "%TOOLS_URL%" >>"%SETUP_LOG%" 2>&1
if errorlevel 1 goto failed

call :log Stage: extract Android command-line tools
tar.exe -xf "%ARCHIVE%" -C "%EXTRACT_ROOT%" >>"%SETUP_LOG%" 2>&1
if errorlevel 1 goto failed

if not exist "%EXTRACT_ROOT%\cmdline-tools\bin\sdkmanager.bat" (
  call :log ERROR: extracted archive did not contain cmdline-tools\bin\sdkmanager.bat
  exit /b 1
)

xcopy "%EXTRACT_ROOT%\cmdline-tools\*" "%SDK_ROOT%\cmdline-tools\latest\" /e /i /h /y >>"%SETUP_LOG%" 2>&1
if errorlevel 1 goto failed

:tools_ready
if not exist "%SDK_MANAGER%" (
  call :log ERROR: sdkmanager was not installed at %SDK_MANAGER%
  exit /b 1
)

call :log Stage: export Android SDK environment
set "ANDROID_HOME=%SDK_ROOT%"
set "ANDROID_SDK_ROOT=%SDK_ROOT%"
>>"%GITHUB_ENV%" echo ANDROID_HOME=%SDK_ROOT%
>>"%GITHUB_ENV%" echo ANDROID_SDK_ROOT=%SDK_ROOT%
>>"%GITHUB_PATH%" echo %SDK_ROOT%\cmdline-tools\latest\bin
>>"%GITHUB_PATH%" echo %SDK_ROOT%\platform-tools

call :log Stage: prepare Android SDK license input
if exist "%LICENSE_INPUT%" del /f /q "%LICENSE_INPUT%"
for /L %%i in (1,1,100) do @echo y>>"%LICENSE_INPUT%"
if not exist "%LICENSE_INPUT%" (
  call :log ERROR: Android SDK license input file was not created
  exit /b 1
)

call :log Stage: accept Android SDK licenses
call "%SDK_MANAGER%" --sdk_root="%SDK_ROOT%" --licenses <"%LICENSE_INPUT%" >>"%SETUP_LOG%" 2>&1
if errorlevel 1 goto failed

call :log Stage: install Android SDK packages
call "%SDK_MANAGER%" --sdk_root="%SDK_ROOT%" "platform-tools" "platforms;android-36" "build-tools;36.0.0" >>"%SETUP_LOG%" 2>&1
if errorlevel 1 goto failed

call :log Stage: verify Android SDK packages
if not exist "%SDK_ROOT%\platform-tools\adb.exe" goto missing_component
if not exist "%SDK_ROOT%\platforms\android-36\android.jar" goto missing_component
if not exist "%SDK_ROOT%\build-tools\36.0.0\aapt2.exe" goto missing_component

call :log Android SDK ready at %SDK_ROOT%
call "%SDK_MANAGER%" --sdk_root="%SDK_ROOT%" --version >>"%SETUP_LOG%" 2>&1
exit /b 0

:missing_component
call :log ERROR: one or more required Android SDK components are missing
exit /b 1

:failed
set "EXIT_CODE=%ERRORLEVEL%"
call :log ERROR: Android SDK setup command failed with exit code %EXIT_CODE%
exit /b %EXIT_CODE%

:log
echo %*
>>"%SETUP_LOG%" echo %date% %time% %*
exit /b 0
