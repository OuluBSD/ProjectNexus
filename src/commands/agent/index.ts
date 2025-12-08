// src/commands/agent/index.ts
// Agent namespace module entry point

import { ProjectListHandler } from './project/list';
import { ProjectCreateHandler } from './project/create';
import { ProjectViewHandler } from './project/view';
import { ProjectUpdateHandler } from './project/update';
import { ProjectDeleteHandler } from './project/delete';
import { ProjectSelectHandler } from './project/select';

import { RoadmapListHandler } from './roadmap/list';
import { RoadmapCreateHandler } from './roadmap/create';
import { RoadmapViewHandler } from './roadmap/view';
import { RoadmapUpdateHandler } from './roadmap/update';
import { RoadmapSelectHandler } from './roadmap/select';

import { ChatListHandler } from './chat/list';
import { ChatCreateHandler } from './chat/create';
import { ChatViewHandler } from './chat/view';
import { ChatUpdateHandler } from './chat/update';
import { AgentChatSendHandler } from './chat/send';
import { ChatSelectHandler } from './chat/select';

import { FileBrowseHandler } from './file/browse';
import { FileReadHandler } from './file/read';
import { FileWriteHandler } from './file/write';
import { FileDiffHandler } from './file/diff';
import { FileOpenHandler } from './file/open';

import { TemplateListHandler } from './template/list';
import { TemplateCreateHandler } from './template/create';

import { TerminalSessionHandler } from './terminal/session';
import { TerminalRunHandler } from './terminal/run';

export const agentCommands = {
  project: {
    list: new ProjectListHandler(),
    create: new ProjectCreateHandler(),
    view: new ProjectViewHandler(),
    update: new ProjectUpdateHandler(),
    delete: new ProjectDeleteHandler(),
    select: new ProjectSelectHandler(),
  },
  roadmap: {
    list: new RoadmapListHandler(),
    create: new RoadmapCreateHandler(),
    view: new RoadmapViewHandler(),
    update: new RoadmapUpdateHandler(),
    select: new RoadmapSelectHandler(),
  },
  chat: {
    list: new ChatListHandler(),
    create: new ChatCreateHandler(),
    view: new ChatViewHandler(),
    update: new ChatUpdateHandler(),
    send: new AgentChatSendHandler(),
    select: new ChatSelectHandler(),
  },
  file: {
    browse: new FileBrowseHandler(),
    read: new FileReadHandler(),
    write: new FileWriteHandler(),
    diff: new FileDiffHandler(),
    open: new FileOpenHandler(),
  },
  template: {
    list: new TemplateListHandler(),
    create: new TemplateCreateHandler(),
  },
  terminal: {
    session: new TerminalSessionHandler(),
    run: new TerminalRunHandler(),
  }
};