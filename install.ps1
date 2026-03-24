# claude-sync installer (Windows PowerShell)
# irm https://raw.githubusercontent.com/danielcregg/claude-sync/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$repo = "danielcregg/claude-sync"
$installDir = Join-Path $env:USERPROFILE ".local\bin"
$scriptName = "claude-sync"

Write-Host "[claude-sync] Installing..." -ForegroundColor Green

# Check Node.js
try {
    $null = & node --version 2>$null
} catch {
    Write-Host "[claude-sync] ERROR: Node.js is not installed." -ForegroundColor Red
    Write-Host "[claude-sync] Install Node.js first: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Create install directory
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

# Download the Node.js script
$mjsPath = Join-Path $installDir "$scriptName.mjs"
Write-Host "[claude-sync] Downloading claude-sync.mjs..."
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/$repo/main/claude-sync.mjs" -OutFile $mjsPath

# Create a .cmd launcher so 'claude-sync' works from cmd and PowerShell
$cmdPath = Join-Path $installDir "$scriptName.cmd"
@"
@echo off
node "%~dp0claude-sync.mjs" %*
"@ | Set-Content -Path $cmdPath -Encoding ASCII

# Create a .ps1 launcher for PowerShell direct invocation
$ps1Path = Join-Path $installDir "$scriptName.ps1"
@"
#!/usr/bin/env pwsh
node "`$PSScriptRoot\claude-sync.mjs" @args
"@ | Set-Content -Path $ps1Path -Encoding UTF8

# Check if install dir is in PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$installDir*") {
    Write-Host ""
    Write-Host "[claude-sync] Adding $installDir to your PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$installDir", "User")
    $env:Path = "$env:Path;$installDir"
    Write-Host "[claude-sync] PATH updated. Restart your terminal for it to take effect." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[claude-sync] Installed to $installDir" -ForegroundColor Green
Write-Host "[claude-sync] Run 'claude-sync init' to get started." -ForegroundColor Green
