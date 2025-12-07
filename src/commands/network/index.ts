// src/commands/network/index.ts
// Network namespace module entry point

import { NetworkServerListHandler } from './server/list';
import { NetworkServerViewHandler } from './server/view';
import { NetworkServerStatusHandler } from './server/status';

import { NetworkConnectionListHandler } from './connection/list';
import { NetworkConnectionViewHandler } from './connection/view';

import { NetworkTopologyViewHandler } from './topology/view';

import { NetworkElementListHandler } from './element/list';
import { NetworkElementViewHandler } from './element/view';
import { NetworkStatusHandler } from './status';

import { NetworkHealthStreamHandler } from './streaming/health-stream';
import { NetworkGraphStreamHandler } from './streaming/graph-stream';
import { NetworkElementMonitorHandler } from './streaming/element-monitor';

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
  },
  element: {
    list: new NetworkElementListHandler(),
    view: new NetworkElementViewHandler(),
    monitor: new NetworkElementMonitorHandler()
  },
  health: {
    stream: new NetworkHealthStreamHandler()
  },
  graph: {
    stream: new NetworkGraphStreamHandler()
  }
};

export { NetworkStatusHandler };