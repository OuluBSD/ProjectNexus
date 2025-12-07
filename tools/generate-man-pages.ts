import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CLI_MANIFEST } from '../src/manifest/cli-manifest.ts';

// Define the man directory
const MAN_DIR = join(process.cwd(), 'man');

function generateManPage(command: typeof CLI_MANIFEST[0]): string {
  const commandName = command.id.replace(/\./g, '-');
  const commandPath = command.path.join(' ');
  
  // Format the man page in simple text format
  let manPage = `.TH NEXUS-${commandName.toUpperCase()} 1 "Nexus CLI"\n`;
  manPage += `.SH NAME\n`;
  manPage += `${commandName} \\- ${command.description}\n`;
  
  manPage += `.SH SYNOPSIS\n`;
  manPage += `nexus ${commandPath}`;
  
  // Add arguments to synopsis
  if (command.args.length > 0) {
    command.args.forEach(arg => {
      const argName = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
      manPage += ` ${argName}`;
    });
  }
  
  // Add flags to synopsis
  if (command.flags.length > 0) {
    manPage += ` [FLAGS]`;
  }
  manPage += `\n`;
  
  manPage += `.SH DESCRIPTION\n`;
  manPage += `${command.description}\n`;
  
  if (command.args.length > 0) {
    manPage += `.SH ARGUMENTS\n`;
    command.args.forEach(arg => {
      const required = arg.required ? ' (required)' : ' (optional)';
      manPage += `.TP\n`;
      manPage += `\\fB${arg.name}\\fR${required}\n`;
      manPage += `\n`;
    });
  }
  
  if (command.flags.length > 0) {
    manPage += `.SH FLAGS\n`;
    command.flags.forEach(flag => {
      const required = flag.required ? ' (required)' : ' (optional)';
      const typeInfo = flag.type ? ` (type: ${flag.type})` : '';
      const valuesInfo = flag.allowedValues ? ` (allowed values: ${flag.allowedValues.join(', ')})` : '';
      manPage += `.TP\n`;
      manPage += `\\fB--${flag.name}\\fR${required}${typeInfo}${valuesInfo}\n`;
      manPage += `\n`;
    });
  }
  
  if (command.contextRequired && command.contextRequired.length > 0) {
    manPage += `.SH CONTEXT REQUIRED\n`;
    manPage += `This command requires the following context: ${command.contextRequired.join(', ')}\n`;
  }
  
  manPage += `.SH STREAMING\n`;
  manPage += `This command ${command.streaming ? 'supports streaming' : 'does not support streaming'}.\n`;
  
  return manPage;
}

function generateManPages() {
  console.log('Generating man pages...');
  
  // Create man directory if it doesn't exist
  if (!existsSync(MAN_DIR)) {
    mkdirSync(MAN_DIR, { recursive: true });
  }
  
  // Generate a man page for each command in the manifest
  for (const command of CLI_MANIFEST) {
    const commandName = command.id.replace(/\./g, '-');
    const fileName = `${commandName}.1`;
    const filePath = join(MAN_DIR, fileName);
    
    const manPageContent = generateManPage(command);
    writeFileSync(filePath, manPageContent);
    
    console.log(`Generated man page: ${fileName}`);
  }
  
  console.log(`Man pages generated successfully in ${MAN_DIR}`);
}

// Run the generator
generateManPages();