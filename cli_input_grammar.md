# Nexus CLI Input Grammar & Parser Specification

## 1. Command Line Structure

### General Structure
The Nexus CLI command line follows a hierarchical structure:

```
nexus [namespace] [resource] [action] [arguments...] [flags...]
```

### Canonical Examples
```
# Simple command
nexus agent project list

# Command with positional argument
nexus agent project view my-project-123

# Command with flags
nexus agent project list --filter category=web

# Command with multiple flags
nexus ai session create --backend=qwen --name="My AI Assistant"

# Command with complex value
nexus agent chat send --message="Hello, this is a test message"
```

### Structure Components

#### Binary
- **Identifier**: `nexus` (fixed binary name)
- **Constraints**: Always the first token in the command line

#### Namespace
- **Definition**: Top-level functional grouping (agent, ai, network, debug, settings)
- **Constraints**: Must be a valid namespace identifier
- **Position**: Second token in the command line

#### Resource
- **Definition**: Entity type within a namespace (project, roadmap, chat, session, etc.)
- **Constraints**: Must be valid for the given namespace
- **Position**: Third token in the command line

#### Action
- **Definition**: Operation to perform on the resource (list, create, view, send, etc.)
- **Constraints**: Must be valid for the given namespace and resource
- **Position**: Fourth token in the command line

#### Arguments and Flags
- **Definition**: Additional parameters for the command
- **Position**: Fifth token onwards, in any order

## 2. Formal Grammar

### EBNF-like Grammar Definition

```
command_line     ::= nexus_binary command_path [argument_list]

nexus_binary     ::= "nexus"

command_path     ::= namespace "/" resource "/" action
                 |  namespace resource action
                 |  namespace resource
                 |  namespace

namespace        ::= identifier

resource         ::= identifier

action           ::= identifier

identifier       ::= [a-zA-Z] [a-zA-Z0-9_-]*

argument_list    ::= argument [argument_list]
                 |  flag [argument_list]
                 |  empty

argument         ::= positional_arg
                 |  named_arg

positional_arg   ::= string_value

named_arg        ::= "--" identifier "=" value
                 |  "--" identifier string_value
                 |  "-" identifier "=" value
                 |  "-" identifier string_value

flag             ::= "--" identifier
                 |  "-" identifier

value            ::= string_value
                 |  number_value
                 |  boolean_value
                 |  list_value

string_value     ::= quoted_string
                 |  unquoted_string

quoted_string    ::= single_quoted_string
                 |  double_quoted_string

single_quoted_string ::= "'" { any_char_except_single_quote | escaped_quote } "'"

double_quoted_string ::= "\"" { any_char_except_double_quote | escaped_double_quote } "\""

unquoted_string  ::= [^ \t\n\r\f\v=] { [^ \t\n\r\f\v] }*

number_value     ::= integer | float

integer          ::= ["-"] digit { digit }

float            ::= ["-"] digit { digit } "." digit { digit }

boolean_value    ::= "true" | "TRUE" | "True" | "false" | "FALSE" | "False"

list_value       ::= "[" value { "," value } "]"

empty            ::= ε

any_char_except_single_quote ::= [^']
any_char_except_double_quote ::= [^"]
escaped_quote    ::= "\'"
escaped_double_quote ::= "\""
digit            ::= [0-9]
```

### Grammar Rules

#### Whitespace Handling
- Whitespace separates tokens (spaces, tabs)
- Whitespace within quoted strings is preserved
- Leading/trailing whitespace around tokens is ignored

#### Case Sensitivity
- Command identifiers are case-insensitive
- String values are case-sensitive unless specified otherwise
- Flag names are case-insensitive

#### Value Types
- **String**: Default type if no explicit conversion
- **Number**: Recognized by numeric pattern
- **Boolean**: Strict "true"/"false" values (case-insensitive)
- **List**: Comma-separated values within square brackets

## 3. Tokenization Rules

### Token Delimiters
- **Space**: Primary delimiter between command elements
- **Equals sign (=)**: Separates flag names from values in `--flag=value` format
- **Comma (,)**: Separates list values
- **Quotes**: Override default delimiters for string values

### Quoting Mechanisms

#### Single Quotes
- Preserve all characters literally except escaped quotes
- Do not interpret special characters or variables
- Example: `'This is a "quoted" string'`

#### Double Quotes
- Preserve most characters literally but allow escape sequences
- Do not interpret shell-specific expansions
- Example: `"This is a \"quoted\" string"`

#### Escape Sequences
- **`\'`** for single quotes within single-quoted strings
- **`\"`** for double quotes within double-quoted strings
- **`\\`** for literal backslashes
- **`\n`** for newlines
- **`\t`** for tabs

### Whitespace Handling
- Leading and trailing whitespace is trimmed from individual tokens
- Internal whitespace within quoted strings is preserved
- Multiple consecutive whitespace characters are treated as a single delimiter

### Example Tokenizations
```
# Input
nexus agent project list --filter 'my project' --limit 10

# Tokens
["nexus", "agent", "project", "list", "--filter", "my project", "--limit", "10"]

# Input with quoting
nexus agent chat send --message="Hello, this has spaces"

# Tokens
["nexus", "agent", "chat", "send", "--message", "Hello, this has spaces"]
```

## 4. Argument & Flag Resolution

### Token Classification
The parser classifies tokens into categories during resolution:

#### Command Path Tokens
- First 2-4 tokens are evaluated as namespace/resource/action path
- Resolution follows hierarchical namespace structure
- Invalid paths result in "unknown command" errors

#### Flag Identification
- Tokens starting with `--` are long-form flags
- Tokens starting with `-` are short-form flags
- Flags without values are treated as boolean (true)

#### Value Association
- `--flag=value` format: Value is directly associated with the flag
- `--flag value` format: Next token is associated with the preceding flag
- Ambiguous cases are resolved by command specification

### Resolution Algorithm

#### Step 1: Command Path Resolution
1. Identify namespace from first token
2. Identify resource from second token
3. Identify action from third token
4. Validate path exists in command specification

#### Step 2: Argument Classification
1. Identify all flag tokens (starting with - or --)
2. Identify positional arguments
3. Associate values with flags

#### Step 3: Schema Validation
1. Validate required arguments are present
2. Validate argument types match expectations
3. Validate mutually exclusive options are not used together

#### Step 4: Default Value Application
1. Apply default values for optional arguments
2. Resolve any context-dependent defaults

### Required vs Optional Arguments
- **Required**: Must be present in command invocation
- **Optional**: May be omitted, use default value if available
- **Positional Required**: Appear in specific order with no flag prefix
- **Named Required**: May use flag prefix but must be provided

### Default Values
- Applied after parsing and validation
- Context-dependent defaults applied based on current state
- Command-specific defaults defined in command specifications

## 5. Error Detection & Reporting

### Parse Error Types

#### Unknown Command
- **Condition**: Command path does not match any registered command
- **Example**: `nexus invalid namespace action`
- **Error Code**: `UNKNOWN_COMMAND`

#### Missing Required Argument
- **Condition**: Required argument not provided
- **Example**: `nexus agent project create` (missing name)
- **Error Code**: `MISSING_REQUIRED_ARGUMENT`

#### Invalid Flag Combination
- **Condition**: Mutually exclusive flags used together
- **Example**: `nexus agent project list --active --archived`
- **Error Code**: `INVALID_FLAG_COMBINATION`

#### Invalid Value Format
- **Condition**: Value does not match expected type
- **Example**: `nexus agent project list --limit invalid`
- **Error Code**: `INVALID_VALUE_FORMAT`

#### Unbalanced Quotes
- **Condition**: Quote started but never closed
- **Example**: `nexus agent project list --filter 'unbalanced`
- **Error Code**: `UNBALANCED_QUOTES`

### Parse Error Format
When parsing errors occur, the CLI outputs a standardized JSON error:

```json
{
  "status": "error",
  "data": null,
  "message": "Human-readable error message",
  "errors": [
    {
      "type": "PARSE_ERROR",
      "code": "string (specific error code)",
      "message": "Technical error message",
      "details": {
        "rawInput": "string (original input that caused error)",
        "tokenPosition": "number (position where error occurred, if available)",
        "tokenValue": "string (problematic token, if available)",
        "expected": "string (what was expected at this position)"
      },
      "timestamp": "string (ISO 8601 timestamp)",
      "requestId": "string (unique identifier)"
    }
  ]
}
```

### Specific Error Examples
```
# Unknown Command Error
{
  "status": "error",
  "data": null,
  "message": "Unknown command: 'nexus invalid list'. Use 'nexus --help' for available commands.",
  "errors": [
    {
      "type": "PARSE_ERROR",
      "code": "UNKNOWN_COMMAND",
      "message": "Command path 'invalid list' does not match any registered command",
      "details": {
        "rawInput": "nexus invalid list",
        "tokenPosition": 1,
        "tokenValue": "invalid",
        "expected": "One of: agent, ai, network, debug, settings"
      },
      "timestamp": "2023-10-01T12:00:00Z",
      "requestId": "req-unknown-cmd-001"
    }
  ]
}

# Missing Required Argument Error
{
  "status": "error",
  "data": null,
  "message": "Missing required argument: --name",
  "errors": [
    {
      "type": "PARSE_ERROR",
      "code": "MISSING_REQUIRED_ARGUMENT",
      "message": "Required argument --name is missing",
      "details": {
        "rawInput": "nexus agent project create",
        "expected": "--name value",
        "commandPath": ["agent", "project", "create"]
      },
      "timestamp": "2023-10-01T12:00:01Z",
      "requestId": "req-missing-arg-002"
    }
  ]
}
```

## 6. Integration with the Runtime

### Parsed Representation Structure
After successful parsing, the CLI passes a structured representation to the runtime:

```json
{
  "commandPath": ["string", "string", "string"],
  "arguments": {
    "positional": ["string", "string", ...],
    "named": {
      "flagName": "value",
      "booleanFlag": true,
      "listFlag": ["value1", "value2"]
    }
  },
  "rawInput": "string (original parsed input)",
  "tokenCount": "number (count of parsed tokens)",
  "context": {
    "userId": "string (if authenticated)",
    "sessionId": "string (if in session context)",
    "timestamp": "string (ISO 8601)"
  }
}
```

### Parser-Runtime Cooperation

#### Validation Handoff
- Parser validates syntax and basic structure
- Runtime validates semantic correctness and context requirements
- Both components contribute to the overall validation process

#### Ambiguity Resolution
- Parser resolves structural ambiguities
- Runtime resolves contextual ambiguities
- Both systems maintain deterministic behavior for AI agents

#### Error Handling Coordination
- Parser handles syntax errors
- Runtime handles semantic errors
- Unified error format maintained across both components

## 7. AI-Friendly Constraints

### Explicit Flag Requirements
- Discourage positional arguments where meaning might be unclear
- Require explicit flags for optional parameters to make intent clear
- Use descriptive flag names that are self-documenting

### Stable Grammar Rules
- Grammar changes only in major releases
- Backward compatibility maintained for existing command patterns
- New syntaxes introduced only when clearly beneficial

### Unambiguous Syntax Patterns
- Discourage multiple ways to specify the same option
- Use consistent ordering (namespace/resource/action pattern)
- Avoid context-sensitive parsing when possible

### Self-Documenting Commands
- Commands should be understandable without external documentation
- Use consistent terminology across all commands
- Provide clear error messages that suggest corrections

## 8. Shell Integration Considerations

### Quoting Rule Design
- Quote rules designed to be compatible with common shells (bash, zsh, fish)
- Avoid special characters that require shell escaping in most contexts
- Support common shell features while maintaining CLI independence

### Completion Considerations
- Command structure designed to support hierarchical completion
- Flag names designed for easy completion implementation
- Argument types designed to support contextual completion

### Potential Shell Integration Features
- Tab completion for namespaces, resources, and actions
- Path completion for file arguments
- Context-aware completion based on current selections
- Syntax highlighting for command line editing

### Shell-Independent Design
- Grammar designed to work across different shell environments
- Avoid shell-specific features in the core grammar
- Maintain independence from shell parsing differences