#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { startCommand } from './commands/start';
import { logCommand } from './commands/log';
import { writeFileCommand } from './commands/write-file';
import { runCommandCommand } from './commands/run-command';
import { describeStateCommand } from './commands/describe-state';

async function run() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('nexus-agent-tool')
    .usage('$0 <cmd> [args]')
    .command(startCommand)
    .command(logCommand)
    .command(writeFileCommand)
    .command(runCommandCommand)
    .command(describeStateCommand)
    .demandCommand(1, 'A command is required')
    .strict()
    .alias('h', 'help')
    .alias('v', 'version')
    .argv;
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});