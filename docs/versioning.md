# Versioning Strategy for Nexus CLI

## Overview

The Nexus CLI follows Semantic Versioning (SemVer) for version numbering, with the format `MAJOR.MINOR.PATCH+buildMetadata`.

## Semantic Versioning Rules

The version format is: `MAJOR.MINOR.PATCH+buildMetadata`

- **MAJOR** version (X.y.z) - Incremented when making breaking CLI changes or introducing new mandatory behavior
- **MINOR** version (x.Y.z) - Incremented when adding new features in a backward-compatible manner
- **PATCH** version (x.y.Z) - Incremented when making backward-compatible bug fixes

## Build Metadata

Build metadata is appended to the version string in the format:
`<version>+<gitHash>.<buildDate>`

For example: `1.2.3+abc1234.2025-12-07`

## Breaking vs Non-Breaking Changes

### Breaking Changes (Require MAJOR bump)
- Removing or renaming CLI commands
- Changing command signatures in a non-backward-compatible way
- Removing or renaming command options/flags
- Changing default behaviors that existing users depend on
- Removing public API functions or changing their signatures

### Non-Breaking Changes
- Adding new commands
- Adding new optional options/flags to existing commands
- Adding new optional API functions
- Bug fixes that maintain backward compatibility
- Performance improvements that don't change behavior
- Documentation updates

## Quality Policy

For MINOR and PATCH releases, the following quality requirements must be met:
- All parity checks must pass (ensuring UX synchronicity)
- All tests must pass
- All quality gates must pass
- No new breaking changes introduced

## Version Management

The version number is maintained in:
- `package.json` - Primary source of truth
- Generated build information file (`src/generated/build-info.ts`) - Runtime access

Version updates should be performed using the version bump script to ensure consistency.