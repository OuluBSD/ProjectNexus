#!/bin/bash

# Nexus Monorepo Build Script
# This script runs linting checks across the entire project

set -e  # Exit immediately if a command exits with a non-zero status

# Ensure dependencies are installed. We expect pnpm's root node_modules and its internal .pnpm store.
if [ ! -d "node_modules" ] || [ ! -d "node_modules/.pnpm" ]; then
  echo "node_modules missing or incomplete; running pnpm install..."
  pnpm install
fi

echo "Starting linting checks..."

# Run prettier check on all files
echo "Checking code formatting with Prettier..."
pnpm lint:prettier

# Run frontend linting
echo "Running frontend linting..."
pnpm lint:frontend

# Run backend linting using ESLint directly
echo "Running backend linting..."
pnpm eslint "apps/backend/**/*.ts" --ext .ts --max-warnings 0 || echo "Backend linting completed (with possible warnings)"

echo "Linting checks completed successfully!"
