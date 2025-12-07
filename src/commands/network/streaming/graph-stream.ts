// src/commands/network/streaming/graph-stream.ts
// Network graph streaming command handler

import { ExecutionContext } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';

export class NetworkGraphStreamHandler {
  async *execute(context: ExecutionContext): AsyncGenerator<any> {
    // Call the API client to stream network graph
    const generator = API_CLIENT.streamNetworkGraph();
    
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