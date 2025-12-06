// src/parser/tokenizer.ts
// Parser tokenizer - converts command line string into tokens

export interface Token {
  type: 'WORD' | 'FLAG' | 'EQUALS' | 'STRING' | 'NUMBER' | 'BOOLEAN' | 'LIST';
  value: string;
  position: number;
}

export class Tokenizer {
  tokenize(input: string): Token[] {
    // Placeholder implementation
    throw new Error('Tokenizer not implemented');
  }
}

export function tokenize(input: string): Token[] {
  const tokenizer = new Tokenizer();
  return tokenizer.tokenize(input);
}