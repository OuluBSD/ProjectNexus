// src/commands/network/index.ts
// Network namespace module entry point

import { NetworkServerListHandler } from './server/list';
import { NetworkServerViewHandler } from './server/view';
import { NetworkServerStatusHandler } from './server/status';

import { NetworkConnectionListHandler } from './connection/list';
import { NetworkConnectionViewHandler } from './connection/view';

import { NetworkTopologyViewHandler } from './topology/view';

export const networkCommands = {
  server: {
    list: new NetworkServerListHandler(),
    view: new NetworkServerViewHandler(),
    status: new NetworkServerStatusHandler(),
  },
  connection: {
    list: new NetworkConnectionListHandler(),
    view: new NetworkConnectionViewHandler(),
  },
  topology: {
    view: new NetworkTopologyViewHandler(),
  }
};