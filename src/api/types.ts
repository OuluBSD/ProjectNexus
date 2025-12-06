// src/api/types.ts
// API-related types

export interface APIRequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: any;
}

export interface APIResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
}