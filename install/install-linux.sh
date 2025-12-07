#!/bin/bash

# nexus CLI Linux Installation Script
# Downloads and installs the nexus CLI for Linux

set -e

# Configuration
VERSION="${1:-latest}"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
BINARY_NAME="nexus"
TEMP_DIR=$(mktemp -d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64)
            echo "x64"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        *)
            print_error "Unsupported architecture: $(uname -m)"
            exit 1
            ;;
    esac
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        print_error "This script is intended for Linux systems only"
        exit 1
    fi
}

# Determine the download URL based on OS and architecture
ARCH=$(detect_arch)
OS=$(detect_os)

if [ "$VERSION" = "latest" ]; then
    DOWNLOAD_URL="https://github.com/nexus/cli/releases/latest/download/nexus-${OS}-${ARCH}"
else
    DOWNLOAD_URL="https://github.com/nexus/cli/releases/download/v${VERSION}/nexus-${OS}-${ARCH}"
fi

print_status "Detected OS: $OS, Architecture: $ARCH"
print_status "Download URL: $DOWNLOAD_URL"

# Check if we have sudo access
if [[ $EUID -ne 0 ]]; then
    SUDO_CMD="sudo"
    print_status "Requesting sudo access for installation..."
else
    SUDO_CMD=""
fi

# Download the binary
print_status "Downloading nexus CLI..."
BINARY_PATH="$TEMP_DIR/$BINARY_NAME"
if command -v curl &> /dev/null; then
    curl -L -o "$BINARY_PATH" "$DOWNLOAD_URL"
elif command -v wget &> /dev/null; then
    wget -O "$BINARY_PATH" "$DOWNLOAD_URL"
else
    print_error "Either curl or wget is required to download the binary"
    exit 1
fi

# Make the binary executable
chmod +x "$BINARY_PATH"

# Verify the binary works
print_status "Verifying nexus CLI..."
"$BINARY_PATH" version

# Create a backup if nexus already exists
if [ -f "$INSTALL_DIR/$BINARY_NAME" ]; then
    print_status "Creating backup of existing nexus binary..."
    $SUDO_CMD cp "$INSTALL_DIR/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME.bak"
fi

# Install the binary
print_status "Installing nexus CLI to $INSTALL_DIR..."
$SUDO_CMD cp "$BINARY_PATH" "$INSTALL_DIR/$BINARY_NAME"

# Clean up
rm -rf "$TEMP_DIR"

print_status "nexus CLI installed successfully!"
print_status "You can now run: nexus --help"

# Check if the install dir is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    print_warning "The installation directory ($INSTALL_DIR) is not in your PATH."
    print_warning "You may need to add it to your shell profile (e.g., ~/.bashrc or ~/.zshrc)"
    print_warning "Add this line: export PATH=\$PATH:$INSTALL_DIR"
fi