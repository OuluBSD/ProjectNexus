# Qwen File Probe Feature

## Overview

The Qwen File Probe is an end-to-end testing mechanism designed to validate that the full Nexus CLI → Backend → Worker → Qwen → File System pipeline is functioning correctly. It creates a deterministic test where Qwen is instructed to create a specific file with known content in a project directory.

## Purpose

The Qwen File Probe serves to:

- Verify the complete backend path is functional (not just mocked components)
- Provide a deterministic test that confirms Qwen can execute file operations
- Validate the integration between CLI, backend, and Qwen services
- Enable automated testing of the full AI execution pipeline

## CLI Command

### Usage

```bash
nexus system chat-qwen-probe --run-id <unique-run-identifier> [options]
```

### Options

- `--run-id` (required): A unique identifier for this probe execution
- `--project-path`: Path to the project directory (overrides current context)
- `--project-id`: Project ID to resolve path from (uses current context if omitted)
- `--file-name`: Custom filename for the probe file (defaults to `.nexus-qwen-probe-ok.txt`)

### Example

```bash
# Using current project context
nexus system chat-qwen-probe --run-id test-12345

# Specifying a project path directly
nexus system chat-qwen-probe --run-id test-12345 --project-path /path/to/project

# With custom filename
nexus system chat-qwen-probe --run-id test-12345 --file-name my-probe-file.txt
```

## Backend Endpoint

### HTTP Endpoint

`POST /ai/qwen/probe-file`

### Request Body

```json
{
  "projectPath": "/path/to/project",
  "runId": "unique-run-identifier",
  "fileName": "optional-filename.txt"
}
```

### Response

Success Response:
```json
{
  "status": "success",
  "message": "Qwen file probe executed successfully",
  "runId": "unique-run-identifier",
  "probeFile": "/path/to/project/.nexus/qwen-probe/filename.txt"
}
```

Error Response:
```json
{
  "status": "error",
  "message": "Error description",
  "runId": "unique-run-identifier"
}
```

## File Output

The probe creates a file in the project's `.nexus/qwen-probe/` directory with the following content format:

```
RUN_ID=<runId>
BACKEND=QWEN
TIMESTAMP=<timestamp>
```

## Testing

### End-to-End Test

The feature includes an end-to-end test in `tests/e2e/qwen-file-probe.test.ts` that:

1. Generates a unique run ID
2. Ensures the probe file doesn't exist initially
3. Executes the CLI command programmatically
4. Verifies the probe file is created with correct content
5. Cleans up the created file after the test

### Running the Test

```bash
# Run the specific test
npm test tests/e2e/qwen-file-probe.test.ts

# Or run all e2e tests
npm run test:e2e
```

## Implementation Details

### Backend Flow

1. CLI sends request to backend with project path and run ID
2. Backend creates a temporary AI session using the Qwen bridge
3. Backend sends a deterministic prompt to Qwen requesting file creation
4. Qwen processes the request and responds with file creation instructions
5. Backend's worker component writes the file to the specified project path
6. Backend returns success response to CLI

### Security Considerations

- Access to the probe endpoint requires valid authentication token
- File writes are restricted to the project directory scope
- The probe feature operates within the established Nexus security model

## Troubleshooting

### Common Issues

1. **Backend Unavailable**: Ensure the Nexus backend is running before executing the probe
2. **Qwen Not Configured**: Verify Qwen backend is properly configured and accessible
3. **Path Permission Errors**: Ensure the project directory has write permissions
4. **Authentication Errors**: Verify your authentication token is valid

### Debugging

Check backend logs for detailed information about probe operations:

```bash
# For local development
npm run dev:backend
```

The probe operations will be logged with `[QwenProbe]` prefix for easy identification.