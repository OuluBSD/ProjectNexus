// src/parser/validator.ts
// Parser validator component - validates parsed commands

import { ParsedCommand } from './grammar-parser';

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

export class Validator {
  validate(parsed: ParsedCommand): ValidationResult {
    // Placeholder implementation
    throw new Error('Validator not implemented');
  }
}

export function validate(parsed: ParsedCommand): ValidationResult {
  const validator = new Validator();
  return validator.validate(parsed);
}