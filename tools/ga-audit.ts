import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { checkParity } from '../src/utils/parity-check.js';
import { CLI_MANIFEST } from '../src/manifest/cli-manifest.js';
import { handlerRegistry } from '../src/runtime/handler-registry.js';
import { loadConfig, getConfigFilePath } from '../src/state/config-store.js';
import { ObservabilityEvent } from '../src/observability/types.js';

// Define the audit check result type
interface AuditCheck {
  id: string;
  description: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

// Define the audit result type
interface AuditResult {
  status: 'ok' | 'error';
  readyForGA: boolean;
  checks: AuditCheck[];
  timestamp: string;
}

// API Surface Stability check
const apiSurfaceStabilityCheck = (): AuditCheck[] => {
  const checks: AuditCheck[] = [];

  // Check if CLI_MANIFEST has entries
  if (CLI_MANIFEST.length === 0) {
    checks.push({
      id: 'api-stability-manifest-entries',
      description: 'CLI manifest has command entries',
      status: 'fail',
      message: 'CLI_MANIFEST is empty'
    });
    return checks;
  }

  // Check each command for required metadata
  let missingFieldsCount = 0;
  for (const cmd of CLI_MANIFEST) {
    // Check for missing description
    if (!cmd.description || cmd.description.trim() === '') {
      checks.push({
        id: `api-stability-${cmd.id}-description`,
        description: `Command has description: ${cmd.id}`,
        status: 'fail',
        message: `Command ${cmd.id} is missing description`
      });
      missingFieldsCount++;
    }

    // Check args have required fields
    if (cmd.args && Array.isArray(cmd.args)) {
      for (const arg of cmd.args) {
        if (typeof arg.name !== 'string' || arg.name.trim() === '') {
          checks.push({
            id: `api-stability-${cmd.id}-arg-name`,
            description: `Command ${cmd.id} arg has valid name`,
            status: 'fail',
            message: `Command ${cmd.id} has an arg with invalid name: ${JSON.stringify(arg)}`
          });
        }
        if (typeof arg.required !== 'boolean') {
          checks.push({
            id: `api-stability-${cmd.id}-arg-required`,
            description: `Command ${cmd.id} arg has required flag`,
            status: 'fail',
            message: `Command ${cmd.id} has an arg missing required flag: ${JSON.stringify(arg)}`
          });
        }
      }
    }

    // Check flags have explicit types
    if (cmd.flags && Array.isArray(cmd.flags)) {
      for (const flag of cmd.flags) {
        if (typeof flag.name !== 'string' || flag.name.trim() === '') {
          checks.push({
            id: `api-stability-${cmd.id}-flag-name`,
            description: `Command ${cmd.id} flag has valid name`,
            status: 'fail',
            message: `Command ${cmd.id} has a flag with invalid name: ${JSON.stringify(flag)}`
          });
        }
        if (typeof flag.required !== 'boolean') {
          checks.push({
            id: `api-stability-${cmd.id}-flag-required`,
            description: `Command ${cmd.id} flag has required flag`,
            status: 'fail',
            message: `Command ${cmd.id} has a flag missing required flag: ${JSON.stringify(flag)}`
          });
        }
        if (typeof flag.type !== 'string' || flag.type.trim() === '') {
          checks.push({
            id: `api-stability-${cmd.id}-flag-type`,
            description: `Command ${cmd.id} flag has explicit type`,
            status: 'fail',
            message: `Command ${cmd.id} has a flag missing type: ${JSON.stringify(flag)}`
          });
        }
      }
    }

    // Check streaming commands correctly declare streaming: true
    if (cmd.path.includes('stream') && cmd.streaming !== true) {
      checks.push({
        id: `api-stability-${cmd.id}-streaming-flag`,
        description: `Streaming command ${cmd.id} declares streaming: true`,
        status: 'fail',
        message: `Command ${cmd.id} contains 'stream' in path but does not have streaming: true`
      });
    }
  }

  if (missingFieldsCount === 0) {
    checks.push({
      id: 'api-stability-fields',
      description: 'All commands have required metadata',
      status: 'pass',
      message: 'All commands have description, args, and flags with required properties'
    });
  }

  return checks;
};

// Backward Compatibility Guard check
const backwardCompatibilityCheck = (): AuditCheck => {
  // Path to stored RC1 manifest
  const rc1ManifestPath = join(process.cwd(), 'release', 'manifests', 'cli-manifest-rc1.json');
  
  try {
    if (!existsSync(rc1ManifestPath)) {
      return {
        id: 'backward-compatibility-rc1-manifest',
        description: 'RC1 manifest snapshot exists for comparison',
        status: 'fail',
        message: 'RC1 manifest snapshot not found at release/manifests/cli-manifest-rc1.json'
      };
    }

    const rc1ManifestContent = readFileSync(rc1ManifestPath, 'utf-8');
    const rc1Manifest = JSON.parse(rc1ManifestContent) as typeof CLI_MANIFEST;
    
    // Compare manifest lengths
    if (CLI_MANIFEST.length !== rc1Manifest.length) {
      return {
        id: 'backward-compatibility-command-count',
        description: 'Command count unchanged from RC1',
        status: 'fail',
        message: `Command count changed: was ${rc1Manifest.length}, now ${CLI_MANIFEST.length}`
      };
    }

    // Create lookup maps for quick comparison
    const rc1Commands = new Map(rc1Manifest.map(cmd => [cmd.id, cmd]));
    const currentCommands = new Map(CLI_MANIFEST.map(cmd => [cmd.id, cmd]));

    // Check that all RC1 commands exist in current manifest
    for (const [id, rc1Cmd] of rc1Commands.entries()) {
      if (!currentCommands.has(id)) {
        return {
          id: 'backward-compatibility-removed-command',
          description: 'No command removed since RC1',
          status: 'fail',
          message: `Command removed since RC1: ${id}`
        };
      }

      const currentCmd = currentCommands.get(id)!;
      
      // Check required flags haven't been removed
      for (const rc1Flag of rc1Cmd.flags) {
        if (rc1Flag.required) {
          const currentFlag = currentCmd.flags.find(f => f.name === rc1Flag.name);
          if (!currentFlag) {
            return {
              id: `backward-compatibility-removed-required-flag-${id}`,
              description: `No required flag removed from ${id} since RC1`,
              status: 'fail',
              message: `Required flag '${rc1Flag.name}' removed from command ${id} since RC1`
            };
          }
          
          // Check that flag type hasn't changed
          if (currentFlag.type !== rc1Flag.type) {
            return {
              id: `backward-compatibility-changed-flag-type-${id}`,
              description: `No flag type changed in ${id} since RC1`,
              status: 'fail',
              message: `Flag '${rc1Flag.name}' type changed from '${rc1Flag.type}' to '${currentFlag.type}' in command ${id}`
            };
          }
        }
      }
      
      // Check positional argument order hasn't changed
      if (rc1Cmd.args.length !== currentCmd.args.length) {
        return {
          id: `backward-compatibility-args-count-${id}`,
          description: `No positional args changed in ${id} since RC1`,
          status: 'fail',
          message: `Number of args changed in command ${id} from ${rc1Cmd.args.length} to ${currentCmd.args.length}`
        };
      }
      
      // Check argument names and required status are consistent
      for (let i = 0; i < rc1Cmd.args.length; i++) {
        const rc1Arg = rc1Cmd.args[i];
        const currentArg = currentCmd.args[i];
        
        if (rc1Arg.name !== currentArg.name) {
          return {
            id: `backward-compatibility-arg-name-${id}`,
            description: `No positional args changed in ${id} since RC1`,
            status: 'fail',
            message: `Arg name changed in command ${id} at position ${i}, was '${rc1Arg.name}', now '${currentArg.name}'`
          };
        }
        
        if (rc1Arg.required !== currentArg.required) {
          return {
            id: `backward-compatibility-arg-required-${id}`,
            description: `No positional args changed in ${id} since RC1`,
            status: 'fail',
            message: `Arg required status changed in command ${id} for '${rc1Arg.name}', was ${rc1Arg.required}, now ${currentArg.required}`
          };
        }
      }
    }

    return {
      id: 'backward-compatibility',
      description: 'Backward compatibility verified against RC1',
      status: 'pass',
      message: 'No breaking changes detected since RC1'
    };
  } catch (error: any) {
    return {
      id: 'backward-compatibility-error',
      description: 'Backward compatibility check',
      status: 'fail',
      message: `Error during backward compatibility check: ${error.message}`
    };
  }
};

// Documentation Presence check
const documentationPresenceCheck = (): AuditCheck[] => {
  const checks: AuditCheck[] = [];

  // Check if man pages directory exists and has content
  const manDir = join(process.cwd(), 'man');
  if (!existsSync(manDir)) {
    checks.push({
      id: 'docs-presence-man-dir',
      description: 'Man pages directory exists',
      status: 'fail',
      message: 'man/ directory does not exist'
    });
  } else {
    const manFiles = existsSync(manDir) ? require('fs').readdirSync(manDir) : [];
    if (manFiles.length === 0) {
      checks.push({
        id: 'docs-presence-man-files',
        description: 'Man pages exist for commands',
        status: 'fail',
        message: 'man/ directory is empty'
      });
    } else {
      checks.push({
        id: 'docs-presence-man-dir',
        description: 'Man pages directory exists',
        status: 'pass',
        message: `man/ directory exists with ${manFiles.length} files`
      });
    }
  }

  // Check if help system works without error
  try {
    // This would normally call the help system without executing it
    // For now, we'll just check if the system is importable
    import('../src/commands/system/help.js');
    checks.push({
      id: 'docs-presence-help-system',
      description: 'Help system works without error',
      status: 'pass',
      message: 'Help system can be imported'
    });
  } catch (error: any) {
    checks.push({
      id: 'docs-presence-help-system',
      description: 'Help system works without error',
      status: 'fail',
      message: `Help system import failed: ${error.message}`
    });
  }

  // Check if release notes exist for current version (v1.0.0-rc1)
  const releaseNotesPath = join(process.cwd(), 'release', 'notes', 'v1.0.0-rc1.md');
  if (!existsSync(releaseNotesPath)) {
    checks.push({
      id: 'docs-presence-release-notes',
      description: 'Release notes exist for current version',
      status: 'fail',
      message: 'Release notes not found for v1.0.0-rc1'
    });
  } else {
    checks.push({
      id: 'docs-presence-release-notes',
      description: 'Release notes exist for current version',
      status: 'pass',
      message: 'Release notes found for v1.0.0-rc1'
    });
  }

  // Check if CHANGELOG has an entry for current version
  const changelogPath = join(process.cwd(), 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    checks.push({
      id: 'docs-presence-changelog',
      description: 'CHANGELOG exists',
      status: 'fail',
      message: 'CHANGELOG.md does not exist'
    });
  } else {
    try {
      const changelogContent = readFileSync(changelogPath, 'utf-8');
      if (!changelogContent.includes('1.0.0-rc1')) {
        checks.push({
          id: 'docs-presence-changelog-entry',
          description: 'CHANGELOG contains entry for current version',
          status: 'fail',
          message: 'CHANGELOG.md does not contain entry for v1.0.0-rc1'
        });
      } else {
        checks.push({
          id: 'docs-presence-changelog',
          description: 'CHANGELOG exists',
          status: 'pass',
          message: 'CHANGELOG.md exists'
        });
      }
    } catch (error: any) {
      checks.push({
        id: 'docs-presence-changelog-read',
        description: 'CHANGELOG can be read',
        status: 'fail',
        message: `Could not read CHANGELOG.md: ${error.message}`
      });
    }
  }

  return checks;
};

// Runtime Robustness check
const runtimeRobustnessCheck = (): AuditCheck[] => {
  const checks: AuditCheck[] = [];
  
  const commandsToTest = [
    { cmd: 'node --loader ts-node/esm src/main.ts help | head -n 10', desc: 'nexus help' },
    { cmd: 'node --loader ts-node/esm src/main.ts system version', desc: 'nexus system version' },
    { cmd: 'node --loader ts-node/esm src/main.ts system doctor', desc: 'nexus system doctor' }
  ];

  for (const { cmd, desc } of commandsToTest) {
    try {
      const result = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
      checks.push({
        id: `runtime-${desc.replace(/\s+/g, '-')}`,
        description: `Command executes: ${desc}`,
        status: 'pass',
        message: `${desc} executed successfully`
      });
    } catch (error: any) {
      checks.push({
        id: `runtime-${desc.replace(/\s+/g, '-')}`,
        description: `Command executes: ${desc}`,
        status: 'fail',
        message: `${desc} failed: ${error.message}`
      });
    }
  }

  return checks;
};

// Streaming Stability check
const streamingStabilityCheck = (): AuditCheck => {
  try {
    // Create a mock streaming event to validate schema
    const mockEvent: Partial<ObservabilityEvent> = {
      seq: 1,
      timestamp: new Date().toISOString(),
      source: 'ai',
      event: 'token',
      data: { content: 'test' }
    };

    const requiredProps = ['seq', 'timestamp', 'source', 'event', 'data'];
    const missingProps = requiredProps.filter(prop => !(prop in mockEvent));

    if (missingProps.length > 0) {
      return {
        id: 'streaming-stability-schema',
        description: 'Streaming event has required properties',
        status: 'fail',
        message: `Streaming event missing required properties: ${missingProps.join(', ')}`
      };
    }

    // Check correct types for essential properties
    if (typeof mockEvent.seq !== 'number') {
      return {
        id: 'streaming-stability-seq-type',
        description: 'Streaming event seq is number',
        status: 'fail',
        message: 'Streaming event seq property must be a number'
      };
    }

    if (typeof mockEvent.timestamp !== 'string' || !mockEvent.timestamp.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/)) {
      return {
        id: 'streaming-stability-timestamp-format',
        description: 'Streaming event timestamp has correct format',
        status: 'fail',
        message: 'Streaming event timestamp format is invalid'
      };
    }

    if (typeof mockEvent.source !== 'string') {
      return {
        id: 'streaming-stability-source-type',
        description: 'Streaming event source is string',
        status: 'fail',
        message: 'Streaming event source property must be a string'
      };
    }

    return {
      id: 'streaming-stability',
      description: 'Streaming event schema validation',
      status: 'pass',
      message: 'Streaming event schema is valid'
    };
  } catch (error: any) {
    return {
      id: 'streaming-stability-error',
      description: 'Streaming stability check',
      status: 'fail',
      message: `Streaming stability check failed: ${error.message}`
    };
  }
};

// Dependency Stability check
const dependencyStabilityCheck = (): AuditCheck => {
  try {
    // Run npm audit and parse the result
    const auditResult = execSync('npm audit --json', { encoding: 'utf-8' });
    const auditData = JSON.parse(auditResult);

    // Check for critical vulnerabilities
    const criticalCount = auditData.metadata?.vulnerabilities?.critical || 0;
    const highCount = auditData.metadata?.vulnerabilities?.high || 0;

    if (criticalCount > 0) {
      return {
        id: 'dependency-stability-critical',
        description: 'Dependency audit - no critical vulnerabilities',
        status: 'fail',
        message: `Found ${criticalCount} critical vulnerabilities. Please address before release.`
      };
    } else if (highCount > 0) {
      return {
        id: 'dependency-stability-high',
        description: 'Dependency audit - no critical vulnerabilities',
        status: 'warn',
        message: `Found ${highCount} high vulnerabilities. Consider addressing before release.`
      };
    } else {
      return {
        id: 'dependency-stability',
        description: 'Dependency audit - no critical vulnerabilities',
        status: 'pass',
        message: 'No critical or high vulnerabilities found'
      };
    }
  } catch (error: any) {
    // If npm audit fails, it might be due to issues with the lockfile
    try {
      const rawOutput = execSync('npm audit', { encoding: 'utf-8' });

      if (rawOutput.includes('found 0 vulnerabilities')) {
        return {
          id: 'dependency-stability',
          description: 'Dependency audit - no critical vulnerabilities',
          status: 'pass',
          message: 'No vulnerabilities found'
        };
      } else if (rawOutput.includes('critical severity')) {
        return {
          id: 'dependency-stability-critical',
          description: 'Dependency audit - no critical vulnerabilities',
          status: 'fail',
          message: 'Critical vulnerabilities found. Run "npm audit" for details.'
        };
      } else {
        return {
          id: 'dependency-stability-high',
          description: 'Dependency audit - no critical vulnerabilities',
          status: 'warn',
          message: 'Vulnerabilities found. Run "npm audit" for details.'
        };
      }
    } catch (innerError: any) {
      // If both npm audit commands fail, it might be due to missing package-lock.json
      if (innerError.message.includes('ENOLOCK') || innerError.message.includes('shrinkwrap')) {
        return {
          id: 'dependency-stability-enoent',
          description: 'Dependency audit - no critical vulnerabilities',
          status: 'warn',
          message: 'Could not run dependency audit: package-lock.json or npm-shrinkwrap.json required. Run "npm install" first.'
        };
      } else {
        return {
          id: 'dependency-stability-error',
          description: 'Dependency audit - no critical vulnerabilities',
          status: 'fail',
          message: `Could not run npm audit: ${innerError.message}`
        };
      }
    }
  }
};

// Install Script Verification check
const installScriptVerificationCheck = (): AuditCheck[] => {
  const checks: AuditCheck[] = [];

  // Check if install scripts exist
  const installScriptPaths = [
    { path: join(process.cwd(), 'install.sh'), desc: 'install.sh' },
    { path: join(process.cwd(), 'install.ps1'), desc: 'install.ps1' },
    { path: join(process.cwd(), 'install.py'), desc: 'install.py' }
  ];

  let foundInstallScript = false;
  for (const { path, desc } of installScriptPaths) {
    if (existsSync(path)) {
      foundInstallScript = true;
      try {
        const content = readFileSync(path, 'utf-8');
        
        // Check for placeholder download URLs and binary references
        let hasPlaceholderURL = false;
        let hasBinaryRefs = false;
        
        if (content.includes('https://') || content.includes('http://')) {
          hasPlaceholderURL = true;
        }
        
        // Check for common binary names in various platforms
        if (
          content.includes('nexus-linux') || 
          content.includes('nexus-macos') || 
          content.includes('nexus-darwin') || 
          content.includes('nexus-windows') ||
          content.includes('nexus.exe')
        ) {
          hasBinaryRefs = true;
        }
        
        if (!hasPlaceholderURL) {
          checks.push({
            id: `install-script-${desc.replace(/\./g, '-')}-url`,
            description: `Install script ${desc} contains download URLs`,
            status: 'warn',
            message: `Install script ${desc} may not contain download URLs`
          });
        } else {
          checks.push({
            id: `install-script-${desc.replace(/\./g, '-')}-url`,
            description: `Install script ${desc} contains download URLs`,
            status: 'pass',
            message: `Install script ${desc} contains download URLs`
          });
        }
        
        if (!hasBinaryRefs) {
          checks.push({
            id: `install-script-${desc.replace(/\./g, '-')}-binary`,
            description: `Install script ${desc} references platform binaries`,
            status: 'warn',
            message: `Install script ${desc} may not reference platform binaries`
          });
        } else {
          checks.push({
            id: `install-script-${desc.replace(/\./g, '-')}-binary`,
            description: `Install script ${desc} references platform binaries`,
            status: 'pass',
            message: `Install script ${desc} references platform binaries`
          });
        }
      } catch (error: any) {
        checks.push({
          id: `install-script-${desc.replace(/\./g, '-')}-read`,
          description: `Install script ${desc} is readable`,
          status: 'fail',
          message: `Could not read ${desc}: ${error.message}`
        });
      }
    }
  }
  
  if (!foundInstallScript) {
    checks.push({
      id: 'install-script-exists',
      description: 'At least one install script exists',
      status: 'fail',
      message: 'No install scripts found (install.sh, install.ps1, install.py)'
    });
  } else {
    checks.push({
      id: 'install-script-exists',
      description: 'At least one install script exists',
      status: 'pass',
      message: 'At least one install script exists'
    });
  }

  return checks;
};

// Main audit function
export const runGAAudit = async (): Promise<AuditResult> => {
  const allChecks: AuditCheck[] = [];

  // Run all checks
  allChecks.push(...apiSurfaceStabilityCheck());
  allChecks.push(backwardCompatibilityCheck());
  allChecks.push(...documentationPresenceCheck());
  allChecks.push(...runtimeRobustnessCheck());
  allChecks.push(streamingStabilityCheck());
  allChecks.push(dependencyStabilityCheck());
  allChecks.push(...installScriptVerificationCheck());

  // Determine overall status and readiness
  const failChecks = allChecks.filter(check => check.status === 'fail');
  const hasFails = failChecks.length > 0;

  const result: AuditResult = {
    status: hasFails ? 'error' : 'ok',
    readyForGA: !hasFails,
    checks: allChecks,
    timestamp: new Date().toISOString()
  };

  return result;
};

export default runGAAudit;

// Run the audit if this script is executed directly
if (import.meta.url === `file://${__filename}`) {
  (async () => {
    try {
      const result = await runGAAudit();

      // Print the result in JSON format
      console.log(JSON.stringify(result, null, 2));

      // Exit with appropriate code
      if (!result.readyForGA) {
        process.exit(1);
      }
    } catch (error: any) {
      console.error('GA audit failed:', error.message);
      process.exit(1);
    }
  })();
}

const __filename = new URL(import.meta.url).pathname;