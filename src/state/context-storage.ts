// src/state/context-storage.ts
// Context storage implementation

import { ContextState } from './context-types';

export class ContextStorage {
  async read(): Promise<ContextState> {
    // Placeholder implementation
    throw new Error('ContextStorage.read not implemented');
  }

  async write(context: ContextState): Promise<void> {
    // Placeholder implementation
    throw new Error('ContextStorage.write not implemented');
  }
}