// src/commands/network/streaming/health-stream.ts
// Network health streaming command handler

import { ExecutionContext } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';

export class NetworkHealthStreamHandler {
  async *execute(context: ExecutionContext): AsyncGenerator<any> {
    // Call the API client to stream network health
    const generator = API_CLIENT.streamNetworkHealth();
    
    for await (const event of generator) {
      yield event;
    }
  }

  validate(args: any): any {
    // Validation is handled at the parser level
    // We return the basic validation result
    return {
      isValid: true,
      args
    };
  }
}