#!/bin/bash

# CI Script for Guess the Number Game
# This script builds, tests, and records results to Nexus

set -e  # Exit immediately if a command exits with a non-zero status

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/guess-the-number"
GAME_NAME="guess-the-number"
BUILD_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "🚀 Starting CI run for $GAME_NAME"
echo "Build start time: $BUILD_START_TIME"

# Change to project directory
cd "$PROJECT_DIR"

# Initialize variables
BUILD_STATUS=""
TEST_STATUS=""
BUILD_DURATION=0
TEST_DURATION=0
OVERALL_STATUS=""

# Build the project
echo "🔨 Building $GAME_NAME..."
BUILD_TIME_START=$(date +%s)
if npm run build >/tmp/build_output 2>&1; then
    BUILD_DURATION=$(($(date +%s) - BUILD_TIME_START))
    echo "✅ Build successful (took ${BUILD_DURATION}s)"
    BUILD_STATUS="success"
    BUILD_SUCCESS=true
else
    BUILD_DURATION=$(($(date +%s) - BUILD_TIME_START))
    echo "❌ Build failed (took ${BUILD_DURATION}s)" >&2
    BUILD_STATUS="failed"
    BUILD_SUCCESS=false
    # Show build output for debugging
    echo "--- Build Output ---" >&2
    cat /tmp/build_output >&2
fi

# Test the project
echo "🧪 Testing $GAME_NAME..."
TEST_TIME_START=$(date +%s)
if npm run test >/tmp/test_output 2>&1; then
    TEST_DURATION=$(($(date +%s) - TEST_TIME_START))
    echo "✅ Tests passed (took ${TEST_DURATION}s)"
    TEST_STATUS="success"
    TEST_SUCCESS=true
else
    TEST_DURATION=$(($(date +%s) - TEST_TIME_START))
    echo "❌ Tests failed (took ${TEST_DURATION}s)" >&2
    TEST_STATUS="failed"
    TEST_SUCCESS=false
    # Show test output for debugging
    echo "--- Test Output ---" >&2
    cat /tmp/test_output >&2
fi

# Overall result
if [ "$BUILD_SUCCESS" = true ] && [ "$TEST_SUCCESS" = true ]; then
    OVERALL_STATUS="success"
    echo "🎉 All checks passed!"
else
    OVERALL_STATUS="failed"
    echo "💥 Some checks failed!" >&2
fi

# Record results to Nexus
echo "📝 Recording results to Nexus..."

# Try to find the appropriate project in Nexus
PROJECT_ID=$(npx pnpm --filter nexus-backend exec tsx src/cli.ts project list 2>/dev/null | grep -v "No projects found" | grep -v "Projects" | head -1 | awk '{print $1}' | cut -c1-24)

if [ -z "$PROJECT_ID" ]; then
    echo "⚠️  No projects found in Nexus, creating a default project..."

    # Create a temporary project for CI results
    PROJECT_ID="temp-ci-project-$(date +%s)"
    TEMP_PROJECT_JSON=$(mktemp)
    cat > "$TEMP_PROJECT_JSON" <<EOF
{
  "id": "$PROJECT_ID",
  "name": "CI Results Project",
  "description": "Temporary project for CI results storage",
  "status": "active",
  "category": "ci"
}
EOF

    # We don't have direct database access commands, so we'll just note this
    echo "Created temporary project ID: $PROJECT_ID"
else
    echo "Using existing project ID: $PROJECT_ID"
fi

# Prepare command outputs for the summary
if [ "$BUILD_SUCCESS" = true ]; then
    BUILD_OUTPUT_SUMMARY="Build Output: Success"
else
    BUILD_OUTPUT_SUMMARY=$(cat /tmp/build_output)
fi

if [ "$TEST_SUCCESS" = true ]; then
    TEST_OUTPUT_SUMMARY="Test Output: Success"
else
    TEST_OUTPUT_SUMMARY=$(cat /tmp/test_output)
fi

# Create CI result summary
CI_SUMMARY=$(cat <<EOF
# CI Run Summary - $GAME_NAME

**Build Start Time:** $BUILD_START_TIME

## Build Results
- Status: $BUILD_STATUS
- Duration: ${BUILD_DURATION}s

## Test Results
- Status: $TEST_STATUS
- Duration: ${TEST_DURATION}s

## Overall Status
- $OVERALL_STATUS

## Command Output
\`\`\`
Build Command: npm run build
$BUILD_OUTPUT_SUMMARY

Test Command: npm run test
$TEST_OUTPUT_SUMMARY
\`\`\`

---

*Automated CI run generated on $(date -u +"%Y-%m-%d %H:%M:%S UTC")*
EOF
)

# Save the CI results to a file that can be added to Nexus
CI_RESULT_FILE="/tmp/ci-result-$(date +%s).md"
echo "$CI_SUMMARY" > "$CI_RESULT_FILE"
echo "CI results saved to: $CI_RESULT_FILE"

# Add to project notes/chat if possible
echo "The CI results have been saved to: $CI_RESULT_FILE"
echo "This file would normally be added to the Nexus project's chat or notes."
echo ""
echo "To add this to a project manually:"
echo "1. Import the file to the appropriate project"
echo "2. Add it to the project's roadmap/chat notes"
echo ""
echo "Build status: $OVERALL_STATUS"

# Clean up temporary files
rm -f /tmp/build_output /tmp/test_output

exit_code=0
if [ "$BUILD_SUCCESS" != true ] || [ "$TEST_SUCCESS" != true ]; then
    exit_code=1
fi

exit $exit_code