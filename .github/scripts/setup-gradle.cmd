@echo off
setlocal EnableExtensions

set "GRADLE_VERSION=9.3.1"
set "GRADLE_ROOT=C:\Gradle"
set "GRADLE_HOME=%GRADLE_ROOT%\gradle-%GRADLE_VERSION%"
set "GRADLE_BIN=%GRADLE_HOME%\bin\gradle.bat"
set "GRADLE_ARCHIVE=%RUNNER_TEMP%\gradle-%GRADLE_VERSION%-bin.zip"
set "GRADLE_URL=https://downloads.gradle.org/distributions/gradle-%GRADLE_VERSION%-bin.zip"

if exist "%GRADLE_BIN%" goto gradle_ready

if exist "%GRADLE_ARCHIVE%" del /f /q "%GRADLE_ARCHIVE%"
mkdir "%GRADLE_ROOT%" 2>nul

echo Downloading Gradle %GRADLE_VERSION%...
curl.exe -fL --retry 5 --retry-all-errors --retry-delay 3 --connect-timeout 30 -o "%GRADLE_ARCHIVE%" "%GRADLE_URL%"
if errorlevel 1 exit /b %ERRORLEVEL%

echo Extracting Gradle %GRADLE_VERSION%...
tar.exe -xf "%GRADLE_ARCHIVE%" -C "%GRADLE_ROOT%"
if errorlevel 1 exit /b %ERRORLEVEL%

:gradle_ready
if not exist "%GRADLE_BIN%" (
  echo Gradle executable was not found at "%GRADLE_BIN%".
  exit /b 1
)

set "GRADLE_HOME=%GRADLE_HOME%"
set "PATH=%GRADLE_HOME%\bin;%PATH%"
>>"%GITHUB_ENV%" echo GRADLE_HOME=%GRADLE_HOME%
>>"%GITHUB_PATH%" echo %GRADLE_HOME%\bin

call "%GRADLE_BIN%" --version
exit /b %ERRORLEVEL%
