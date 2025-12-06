// src/parser/grammar-parser.ts
// Parser grammar component - converts tokens into command structure

import { Token, TokenResult, TokenError } from './tokenizer';

export interface CommandAST {
  type: 'Command';
  commandPath: [string, string, string] | [string, string] | [string] | []; // [namespace, resource, action] or partial
  arguments: {
    positional: string[];
    named: Record<string, string | boolean | string[]>;
  };
  rawInput: string;
}

export interface ParseError {
  error: true;
  message: string;
  position: number;
}

export type ParseResult = CommandAST | ParseError;

export class GrammarParser {
  private tokens: Token[] = [];
  private position: number = 0;
  private rawInput: string = '';

  parse(tokens: Token[], raw: string): ParseResult {
    // Check if tokens is actually a TokenError from tokenizer
    if (!Array.isArray(tokens)) {
      // This shouldn't happen based on our design, but let's handle it
      const tokenError = tokens as unknown as TokenError;
      return {
        error: true,
        message: tokenError.message,
        position: tokenError.position
      };
    }

    this.tokens = tokens;
    this.position = 0;
    this.rawInput = raw;

    // Start parsing from the beginning
    return this.parseCommand();
  }

  private parseCommand(): ParseResult {
    // Initialize the result structure
    const result: CommandAST = {
      type: 'Command',
      commandPath: [],
      arguments: {
        positional: [],
        named: {}
      },
      rawInput: this.rawInput
    };

    try {
      // Parse the command path (namespace/resource/action)
      const pathResult = this.parseCommandPath();
      if ('error' in pathResult) {
        return pathResult;
      }
      result.commandPath = pathResult;

      // Parse remaining arguments and flags
      const argsFlagsResult = this.parseArgumentsAndFlags();
      if ('error' in argsFlagsResult) {
        return argsFlagsResult;
      }

      // Merge the parsed arguments and flags into the result
      result.arguments = {
        positional: argsFlagsResult.positional,
        named: argsFlagsResult.named
      };

      return result;
    } catch (e) {
      if (this.isParseError(e)) {
        return e as ParseError;
      }
      return this.createParseError(`Unexpected parsing error: ${(e as Error).message}`, this.position);
    }
  }

  private isParseError(obj: any): obj is ParseError {
    return obj && typeof obj === 'object' && obj.error === true && typeof obj.message === 'string';
  }

  private createParseError(message: string, position: number): ParseError {
    return { error: true, message, position };
  }

  private parseCommandPath(): [string, string, string] | [string, string] | [string] | [] | ParseError {
    const path: string[] = [];

    // Parse namespace (first identifier)
    if (this.position < this.tokens.length) {
      const token = this.tokens[this.position];
      if (token && token.type === 'WORD') {
        path.push(token.value);
        this.position++;
      } else {
        // If there's no initial WORD, return empty path
        return [];
      }
    } else {
      // If there's no initial WORD, return empty path
      return [];
    }

    // Parse resource (second identifier)
    if (this.position < this.tokens.length) {
      const token = this.tokens[this.position];
      if (token && token.type === 'WORD') {
        path.push(token.value);
        this.position++;
      }
    }

    // Parse action (third identifier)
    if (this.position < this.tokens.length) {
      const token = this.tokens[this.position];
      if (token && token.type === 'WORD') {
        path.push(token.value);
        this.position++;
      }
    }

    // Convert to proper tuple type based on path length
    if (path.length === 1) {
      return [path[0]] as [string];
    } else if (path.length === 2) {
      return [path[0], path[1]] as [string, string];
    } else if (path.length === 3) {
      return [path[0], path[1], path[2]] as [string, string, string];
    } else {
      return path as any;
    }
  }

  private parseArgumentsAndFlags(): { positional: string[]; named: Record<string, string | boolean | string[]> } | ParseError {
    const positional: string[] = [];
    const named: Record<string, string | boolean | string[]> = {};

    while (this.position < this.tokens.length) {
      const token = this.tokens[this.position];
      if (!token) {
        return this.createParseError(`Unexpected end of tokens at position ${this.position}`, this.position);
      }

      if (token.type === 'FLAG') {
        // Initially parse the flag
        const flagToken = this.tokens[this.position];
        if (!flagToken) {
          return this.createParseError(`Flag token missing at position ${this.position}`, this.position);
        }
        this.position++; // Consume the flag token

        let flagName = flagToken.value;
        let flagValue: string | boolean | string[] = true; // Default to boolean

        // Check if next token is an equals sign
        if (this.position < this.tokens.length) {
          const nextToken = this.tokens[this.position];
          if (nextToken && nextToken.type === 'EQUALS') {
            // Format: --flag=value
            this.position++; // Skip equals sign

            if (this.position >= this.tokens.length) {
              return this.createParseError(`Expected value after equals sign for flag --${flagName}`, flagToken.position);
            }

            const valueToken = this.tokens[this.position];
            if (!valueToken || (valueToken.type !== 'WORD' && valueToken.type !== 'STRING' &&
                valueToken.type !== 'NUMBER' && valueToken.type !== 'BOOLEAN')) {
              return this.createParseError(`Invalid value type for flag --${flagName}`, this.position);
            }

            flagValue = valueToken.value;
            this.position++; // Consume the value token
          }
          // Check if there's a next token that's not another flag
          else if (this.position < this.tokens.length) {
            const nextToken = this.tokens[this.position];
            if (nextToken && nextToken.type !== 'FLAG') {
              // Format: --flag value (assign value to flag)
              flagValue = nextToken.value;
              this.position++; // Consume the value token
            }
          }
        }
        // If no equals and next token is a flag, flag remains boolean

        named[flagName] = flagValue;
      } else if (token.type === 'WORD' || token.type === 'STRING' || token.type === 'NUMBER' || token.type === 'BOOLEAN') {
        // Handle positional arguments
        this.position++;
        positional.push(token.value);
      } else if (token.type === 'EQUALS') {
        // This should not happen as equals tokens should be processed as part of flags
        return this.createParseError(`Unexpected equals operator at position ${token.position}`, token.position);
      } else {
        // Unexpected token type
        return this.createParseError(`Unexpected token type ${token.type} at position ${token.position}`, token.position);
      }
    }

    return { positional, named };
  }


  // Helper method to peek at the next token without consuming it
  private peekNextTokenType(): string | null {
    if (this.position < this.tokens.length) {
      const token = this.tokens[this.position];
      return token ? token.type : null;
    }
    return null;
  }
}

export function parse(tokens: Token[], raw: string): ParseResult {
  const parser = new GrammarParser();
  return parser.parse(tokens, raw);
}