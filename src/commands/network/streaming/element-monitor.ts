// src/commands/network/streaming/element-monitor.ts
// Network element monitoring command handler

import { ExecutionContext } from '../../../runtime/types';
import { API_CLIENT } from '../../../api/client';

export class NetworkElementMonitorHandler {
  async *execute(context: ExecutionContext): AsyncGenerator<any> {
    const { id } = context.flags;
    
    // Call the API client to stream network element health
    const generator = API_CLIENT.streamNetworkElementHealth(id);
    
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