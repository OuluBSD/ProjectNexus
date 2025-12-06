// src/parser/index.ts
// Parser module entry point

export { tokenize } from './tokenizer';
export { parse } from './grammar-parser';
export { validate } from './validator';

export interface Token {
  type: 'WORD' | 'FLAG' | 'EQUALS' | 'STRING' | 'NUMBER' | 'BOOLEAN' | 'LIST';
  value: string;
  position: number;
}

export interface ParsedCommand {
  commandPath: string[]; // [namespace, resource, action]
  arguments: {
    positional: string[];
    named: Record<string, string | boolean | string[]>;
  };
  rawInput: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ParseError[];
  normalized?: ParsedCommand;
}

export interface ParseError {
  code: string;
  message: string;
  position?: number;
  token?: string;
}

// Main parser function
export function parseCommandLine(input: string): ParsedCommand {
  throw new Error('parseCommandLine not implemented');
}