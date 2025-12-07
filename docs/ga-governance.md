# GA Governance

This document outlines the long-term governance rules for Nexus CLI GA (General Availability) releases. It serves as a reference for maintainers and users on the stability guarantees, versioning policy, and release procedures.

## Versioning Policy

Nexus CLI follows Semantic Versioning (SemVer):

- MAJOR.MINOR.PATCH (e.g., 1.0.0)
- MAJOR: Breaking changes that may impact existing users
- MINOR: Backward-compatible feature additions
- PATCH: Backward-compatible bug fixes

For detailed versioning rules, see [versioning.md](versioning.md).

## Parity Requirements

Before any GA release, all commands must maintain parity between:

- CLI and Web UI functionality
- All supported platforms (Linux, macOS, Windows)
- All supported Node.js versions
- Documentation and actual implementation

Parity is verified through automated checks during the release process.

## ABI Stability Rules

Starting with v1.0.0 GA, the following Application Binary Interface (ABI) elements are contractually stable:

- Command structure and paths (e.g. `nexus agent project list`)
- Flag names and types for all existing commands
- Exit codes for standard operations
- Output formats (unless explicitly versioned)
- Configuration file structure

## Manifest Stability Guarantees

The CLI manifest provides stability guarantees for GA releases:

- No commands will be removed within the same major version
- No required flags will be removed from existing commands
- No positional arguments will change position within the same major version
- New optional flags may be added to existing commands
- New commands may be added as minor version updates

## Backward Compatibility Obligations

During the v1.x cycle, we guarantee:

- All valid commands from v1.0.0 continue to work in v1.y.z
- Output formats will not change unexpectedly (unless explicitly versioned)
- Exit codes for successful/failed operations remain consistent
- Configuration files from v1.0.0 are readable by v1.y.z

Breaking changes must be introduced as major version releases with appropriate deprecation notices in prior minor releases.

## Release Workflow Overview

1. **Development Phase**: Features and fixes are implemented with tests
2. **RC Phase**: Release Candidate is tested for stability and feature completeness
3. **GA Phase**: Final release after successful RC validation
4. **Maintenance Phase**: Patch releases for bug fixes only

Each phase is governed by specific quality gates and validation criteria.

## Deprecation Policy

When deprecating features in a major version cycle:

1. Issue deprecation warning for at least two minor versions
2. Document migration path in release notes
3. Provide alternative implementations where possible
4. Remove deprecated functionality only in the next major version

## Support Horizon for GA Versions

- **Active Support**: All versions in the current major series
- **Security Fixes**: Critical security vulnerabilities addressed for all minor versions in current major series
- **Bug Fixes**: Only applied to the most recent minor version
- **End of Support**: Announced 12 months before termination

---

This governance document was last updated with the v1.0.0-rc1 release and becomes effective with the v1.0.0 GA release.