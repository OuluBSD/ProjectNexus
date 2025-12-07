# nexus CLI Windows Installation Script
# Downloads and installs the nexus CLI for Windows

param(
    [string]$Version = "latest",
    [string]$InstallDir = "$env:ProgramFiles\nexus",
    [switch]$AddToPath = $true
)

# Configuration
$BINARY_NAME = "nexus.exe"
$TEMP_DIR = [System.IO.Path]::GetTempPath() + [System.IO.Path]::GetRandomFileName()
$BINARY_PATH = "$TEMP_DIR\$BINARY_NAME"

# Create temporary directory
New-Item -ItemType Directory -Path $TEMP_DIR -Force

# Function to print status
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    $host.UI.WriteErrorLine($Message)
}

# Detect architecture
$ARCH = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x64" }  # Windows only supports x64 for now
$OS = "windows"

# Determine the download URL based on OS and architecture
if ($Version -eq "latest") {
    $DOWNLOAD_URL = "https://github.com/nexus/cli/releases/latest/download/nexus-$OS-$ARCH.exe"
} else {
    $DOWNLOAD_URL = "https://github.com/nexus/cli/releases/download/v$Version/nexus-$OS-$ARCH.exe"
}

Write-Status "Detected OS: $OS, Architecture: $ARCH"
Write-Status "Download URL: $DOWNLOAD_URL"

# Create install directory if it doesn't exist
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force
    Write-Status "Created installation directory: $InstallDir"
}

# Download the binary
Write-Status "Downloading nexus CLI..."
try {
    Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $BINARY_PATH
} catch {
    Write-Error "Failed to download nexus CLI: $($_.Exception.Message)"
    exit 1
}

# Verify the binary exists
if (!(Test-Path $BINARY_PATH)) {
    Write-Error "Downloaded binary not found at $BINARY_PATH"
    exit 1
}

# Create a backup if nexus already exists
$INSTALL_PATH = Join-Path $InstallDir $BINARY_NAME
if (Test-Path $INSTALL_PATH) {
    $BACKUP_PATH = $INSTALL_PATH + ".bak"
    Copy-Item $INSTALL_PATH $BACKUP_PATH
    Write-Status "Created backup of existing nexus binary at $BACKUP_PATH"
}

# Install the binary
Write-Status "Installing nexus CLI to $InstallDir..."
Copy-Item $BINARY_PATH $INSTALL_PATH

# Clean up
Remove-Item $TEMP_DIR -Recurse -Force

Write-Status "nexus CLI installed successfully!"
Write-Status "You can now run: nexus --help"

# Add to PATH if requested
if ($AddToPath) {
    $CURRENT_PATH = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    if ($CURRENT_PATH -notlike "*$InstallDir*") {
        $NEW_PATH = $CURRENT_PATH + ";$InstallDir"
        [System.Environment]::SetEnvironmentVariable("PATH", $NEW_PATH, "User")
        Write-Status "Added $InstallDir to your PATH environment variable."
        Write-Warning "You may need to restart your terminal or PowerShell session for the PATH changes to take effect."
    } else {
        Write-Status "$InstallDir is already in your PATH."
    }
} else {
    Write-Warning "The installation directory ($InstallDir) is not in your PATH."
    Write-Warning "You may need to add it to your PATH manually."
}

# Test that the installation works
Write-Status "Testing nexus CLI installation..."
try {
    & $INSTALL_PATH version
} catch {
    Write-Warning "Could not verify nexus CLI installation: $($_.Exception.Message)"
}