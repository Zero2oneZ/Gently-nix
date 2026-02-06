# Windows Validator
# PowerShell script for Windows 10/11

Write-Host "========================================"
Write-Host "  Windows Validator"
Write-Host "  The Corporate Kingdom"
Write-Host "========================================"
Write-Host ""

$Errors = 0

function Pass { param($msg) Write-Host "[PASS] $msg" -ForegroundColor Green }
function Fail { param($msg) Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:Errors++ }
function Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }

# Check Windows version
$WinVer = [System.Environment]::OSVersion.Version
$WinBuild = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").CurrentBuild
Pass "Windows Build: $WinBuild"

# Check architecture
$Arch = $env:PROCESSOR_ARCHITECTURE
if ($Arch -eq "AMD64") {
    Pass "Architecture: x86_64"
} elseif ($Arch -eq "ARM64") {
    Pass "Architecture: ARM64"
} else {
    Warn "Architecture: $Arch"
}

# Check Rust
Write-Host ""
Write-Host "--- Build Tools ---"
if (Get-Command rustc -ErrorAction SilentlyContinue) {
    $RustVer = rustc --version
    Pass "Rust: $RustVer"
} else {
    Fail "Rust not installed"
    Write-Host "      Download from: https://rustup.rs"
}

# Check Visual Studio Build Tools
$VSWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $VSWhere) {
    $VSPath = & $VSWhere -latest -property installationPath
    if ($VSPath) {
        Pass "Visual Studio Build Tools found"
    } else {
        Fail "Visual Studio Build Tools not found"
    }
} else {
    Warn "Cannot detect Visual Studio (vswhere not found)"
}

# Check Git
if (Get-Command git -ErrorAction SilentlyContinue) {
    $GitVer = git --version
    Pass "Git: $GitVer"
} else {
    Fail "Git not installed"
    Write-Host "      Download from: https://git-scm.com/download/win"
}

# Check GPU
Write-Host ""
Write-Host "--- GPU ---"
$GPU = Get-WmiObject Win32_VideoController | Select-Object -First 1
if ($GPU) {
    Pass "GPU: $($GPU.Name)"
    if ($GPU.Name -match "NVIDIA") {
        Pass "CUDA potentially available"
    }
} else {
    Warn "Cannot detect GPU"
}

# Check memory
Write-Host ""
Write-Host "--- Hardware ---"
$MemGB = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
Pass "Memory: ${MemGB}GB"

# Summary
Write-Host ""
Write-Host "========================================"
if ($Errors -eq 0) {
    Write-Host "Windows environment validated" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Validation failed: $Errors errors" -ForegroundColor Red
    exit 1
}
