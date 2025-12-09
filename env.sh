#!/usr/bin/env bash

# Add the bin directory to PATH to make nexus-agent-tool available
export PATH="$PWD/bin:$PATH"

# Additionally, make sure node is available for running nexus-agent-tool
export NODE_PATH="$(npm root -g):$NODE_PATH"

echo "Environment configured. nexus-agent-tool should now be available in PATH."
echo "Current PATH: $PATH"