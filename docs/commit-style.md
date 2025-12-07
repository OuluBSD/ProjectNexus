# Commit Message Conventions

This document describes the commit message conventions for the Nexus CLI project, following the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Format

Each commit message consists of a header, an optional body, and an optional footer. The header has a special format that includes a type, an optional scope, and a subject:

```
<type>(<scope>): <short summary>
```

### Type

Must be one of the following:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Other changes that don't modify src or test files

### Scope

The scope should be a single word that provides additional contextual information about the change. It should be a part of the codebase that's affected by the change (e.g., `cli`, `parser`, `config`, `help`).

### Subject

The short summary should be:
- Written in present tense ("add", not "added" or "adds")
- Written in imperative mood ("move cursor to...", not "moves cursor to...")
- Not capitalized
- Not ending with a period

## Breaking Changes

Breaking changes should be indicated with an exclamation mark after the type/scope:

```
feat(cli)!: remove deprecated commands
```

Alternatively, breaking changes can be included in the body or footer:

```
feat: add new authentication system

BREAKING CHANGE: The old authentication system has been removed.
```

## Examples

### Feature Addition
```
feat(cli): add new export command
```

### Feature with Scope
```
feat(parser): support for JSON configuration files
```

### Breaking Change
```
feat(api)!: change authentication method

The old authentication method has been replaced with OAuth2.
This is a breaking change for existing integrations.
```

### Bug Fix
```
fix(cli): resolve issue with command parsing
```

### Refactoring
```
refactor(config): improve module structure
```

### Documentation
```
docs: update installation instructions
```