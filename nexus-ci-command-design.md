# Proposed "nexus ci run" Command Design

## Overview
The `nexus ci run` command would be a high-level command that automates the CI/CD process for projects managed in Nexus. It would handle building, testing, and recording results back to Nexus in a single command.

## Command Structure
```
nexus ci run [options] [project-id]
```

## Options
- `--project-id <id>`: Specify the project ID to run CI for (alternative to positional argument)
- `--build-cmd <command>`: Custom build command (default: "npm run build")
- `--test-cmd <command>`: Custom test command (default: "npm run test") 
- `--output-format <format>`: Output format (default: "pretty", options: "pretty", "json")
- `--record-results`: Whether to record results to Nexus (default: true)
- `--create-roadmap`: Whether to create a new roadmap entry for this CI run (default: true)
- `--dry-run`: Run through the motions without actually executing or recording (default: false)
- `--config <file>`: Path to CI configuration file (default: "./nexus-ci.config.json")

## CI Configuration File
A `nexus-ci.config.json` file could be used to specify project-specific CI configurations:

```json
{
  "build": {
    "command": "npm run build",
    "timeout": 300
  },
  "test": {
    "command": "npm run test",
    "timeout": 600
  },
  "artifacts": {
    "paths": ["dist/**/*", "build/**/*", "coverage/**/*"]
  },
  "notifications": {
    "onSuccess": [],
    "onFailure": []
  }
}
```

## Execution Flow

1. **Project Identification**
   - If project ID is not provided, try to auto-detect from current directory
   - Validate that the project exists in Nexus

2. **Configuration Loading**
   - Load CI configuration from nexus-ci.config.json if it exists
   - Apply command-line options to override configuration values

3. **Pre-Run Setup**
   - Create a new CI run record in the database
   - Initialize timing and logging

4. **Build Phase**
   - Execute build command
   - Capture exit code, stdout, stderr
   - Record build timing and status

5. **Test Phase** 
   - Execute test command
   - Capture exit code, stdout, stderr
   - Record test timing and status

6. **Result Recording**
   - Calculate overall status based on build and test results
   - Create a summary report
   - Add the report to the project's roadmap or chat notes in Nexus

7. **Output**
   - Display results in requested format
   - Exit with appropriate code (0 for success, non-zero for failure)

## Example Usage

```bash
# Run CI for the default project in current directory
nexus ci run

# Run CI for a specific project
nexus ci run my-project-123

# Run CI with custom commands
nexus ci run --build-cmd "make build" --test-cmd "make test" my-project-123

# Run CI without recording results
nexus ci run --dry-run

# Run CI with JSON output
nexus ci run --output-format json
```

## Data Model Updates

The system would need to support CI run records with the following structure:

```typescript
interface CiRun {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  buildResult?: {
    status: 'success' | 'failed';
    duration: number; // in seconds
    output: string;
  };
  testResult?: {
    status: 'success' | 'failed';
    duration: number; // in seconds
    output: string;
  };
  artifacts?: string[]; // paths to artifacts
  metadata?: Record<string, unknown>; // additional metadata
}
```

## Integration Points

1. **Database Schema**: Add CiRun table with appropriate relationships to Project
2. **API Endpoints**: Add endpoints to create, retrieve, and update CI run records
3. **CLI Command**: Implement the `nexus ci run` command
4. **UI Integration**: Show CI run history in the project dashboard
5. **Notifications**: Option to send notifications based on CI results

## Error Handling

- Graceful timeout handling for build/test commands
- Proper exit codes mapping
- Detailed logging for debugging
- Fallback mechanisms when optional services are unavailable

## Security Considerations

- Validate that users have permission to run CI on specified projects
- Sanitize command inputs to prevent command injection
- Limit artifact paths to project directories only