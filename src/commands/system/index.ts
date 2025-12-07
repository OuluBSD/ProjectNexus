// src/commands/system/index.ts
// System namespace module entry point

import { SystemHelpHandler } from './help';
import { SystemVersionHandler } from './version';
import { SystemParityHandler } from './parity';
import { SystemCompletionHandler } from './completion';
import { SystemDoctorHandler } from './doctor';

export const systemCommands = {
  help: new SystemHelpHandler(),
  version: new SystemVersionHandler(),
  parity: new SystemParityHandler(),
  completion: new SystemCompletionHandler(),
  doctor: new SystemDoctorHandler()
};