// src/utils/errors.ts
// Error handling utilities

export class CLIError extends Error {
  public code: string;
  public details: any;

  constructor(message: string, code: string = 'CLI_ERROR', details?: any) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function createError(message: string, code: string, details?: any): CLIError {
  return new CLIError(message, code, details);
}