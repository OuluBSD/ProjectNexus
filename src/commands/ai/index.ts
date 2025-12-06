// src/commands/ai/index.ts
// AI namespace module entry point

import { AISessionListHandler } from './session/list';
import { AISessionCreateHandler } from './session/create';
import { AISessionDeleteHandler } from './session/delete';
import { AISessionSwitchHandler } from './session/switch';
import { AISessionViewHandler } from './session/view';

import { AIMessageSendHandler } from './message/send';
import { AIMessageListHandler } from './message/list';
import { AIMessageStreamHandler } from './message/stream';
import { AIMessageClearHandler } from './message/clear';

import { AIBackendListHandler } from './backend/list';
import { AIBackendSelectHandler } from './backend/select';
import { AIBackendStatusHandler } from './backend/status';

export const aiCommands = {
  session: {
    list: new AISessionListHandler(),
    create: new AISessionCreateHandler(),
    delete: new AISessionDeleteHandler(),
    switch: new AISessionSwitchHandler(),
    view: new AISessionViewHandler(),
  },
  message: {
    send: new AIMessageSendHandler(),
    list: new AIMessageListHandler(),
    stream: new AIMessageStreamHandler(),
    clear: new AIMessageClearHandler(),
  },
  backend: {
    list: new AIBackendListHandler(),
    select: new AIBackendSelectHandler(),
    status: new AIBackendStatusHandler(),
  }
};