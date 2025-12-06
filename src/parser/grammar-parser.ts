// src/parser/grammar-parser.ts
// Parser grammar component - converts tokens into command structure

import { Token } from './tokenizer';

export interface ParsedCommand {
  commandPath: string[]; // [namespace, resource, action]
  arguments: {
    positional: string[];
    named: Record<string, string | boolean | string[]>;
  };
  rawInput: string;
}

export class GrammarParser {
  parse(tokens: Token[]): ParsedCommand {
    // Placeholder implementation
    throw new Error('GrammarParser not implemented');
  }
}

export function parse(tokens: Token[]): ParsedCommand {
  const parser = new GrammarParser();
  return parser.parse(tokens);
}