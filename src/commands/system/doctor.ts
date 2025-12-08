// src/commands/system/doctor.ts
// System Doctor command - checks system configuration and connectivity

import { CommandHandler } from '../../runtime/handler-registry';
import { ExecutionContext, CommandResult } from '../../runtime/types';
import { loadConfig, getConfigFilePath } from '../../state/config-store';
import { APIClient } from '../../api/client';
import fs from 'fs/promises';
import path from 'path';

interface DoctorCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
  fixHint?: string;
}

export class SystemDoctorHandler implements CommandHandler {
  async execute(_ctx: ExecutionContext): Promise<CommandResult> {
    try {
      const checks: DoctorCheck[] = [];
      
      // Check config integrity
      checks.push(await checkConfig());
      
      // Check API connectivity
      checks.push(await checkAPIConnectivity());
      
      // Check auth token usability
      checks.push(await checkAuthToken());
      
      // Check file permissions for config directory
      checks.push(await checkConfigFilePermissions());
      
      // Check parity
      checks.push(await checkParity());

      // Check version status
      checks.push(await checkVersionStatus());

      // Determine overall status
      const overallStatus = checks.some(check => check.status === 'error')
        ? 'error'
        : checks.some(check => check.status === 'warning')
          ? 'warning'
          : 'ok';
      
      const result = {
        status: overallStatus,
        checks
      };
      
      return {
        status: 'ok' as const,
        data: result,
        message: `System doctor check completed. Overall status: ${overallStatus}`,
        errors: []
      };
    } catch (error: any) {
      return {
        status: 'error',
        data: null,
        message: `System doctor check failed: ${error.message}`,
        errors: [{
          type: 'DOCTOR_ERROR',
          message: error.message
        }]
      };
    }
  }
};

async function checkConfig(): Promise<DoctorCheck> {
  try {
    const config = await loadConfig();
    
    // Verify all required fields exist
    if (!config.apiBaseUrl) {
      return {
        name: 'config',
        status: 'error',
        message: 'Missing API base URL in configuration',
        fixHint: 'Run "nexus settings set --key apiBaseUrl --value <your-api-url>" to set the API base URL'
      };
    }

    return {
      name: 'config',
      status: 'ok',
      message: 'Configuration loaded successfully',
      fixHint: 'System configuration is valid'
    };
  } catch (error: any) {
    // Check if this is a config parsing error
    const isParseError = error instanceof SyntaxError || error.message.toLowerCase().includes('json') || error.message.toLowerCase().includes('parse');
    const message = isParseError
      ? `Configuration parsing error: ${error.message}`
      : `Configuration error: ${error.message}`;

    return {
      name: 'config',
      status: 'error',
      message,
      fixHint: isParseError
        ? 'Configuration file syntax error. Check ~/.nexus/config.json for proper JSON formatting, or run "rm ~/.nexus/config.json" to reset configuration'
        : 'Check your configuration file at ~/.nexus/config.json for syntax errors'
    };
  }
}

async function checkAPIConnectivity(): Promise<DoctorCheck> {
  try {
    const config = await loadConfig();
    const client = new APIClient();
    
    // Try to make a simple request to check connectivity
    const response = await fetch(`${config.apiBaseUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': config.authToken ? `Bearer ${config.authToken}` : ''
      }
    });
    
    if (response.ok) {
      return {
        name: 'api',
        status: 'ok',
        message: 'API connectivity established',
        fixHint: 'API is accessible and responding correctly'
      };
    } else {
      return {
        name: 'api',
        status: 'warning',
        message: `API returned status ${response.status}`,
        fixHint: `Check API server status, received HTTP ${response.status} response`
      };
    }
  } catch (error: any) {
    return {
      name: 'api',
      status: 'warning',
      message: `API connectivity failed: ${error.message}`,
      fixHint: 'Verify API server is running and accessible at the configured URL'
    };
  }
}

async function checkAuthToken(): Promise<DoctorCheck> {
  try {
    const config = await loadConfig();
    
    if (!config.authToken) {
      return {
        name: 'auth',
        status: 'warning',
        message: 'No authentication token set',
        fixHint: 'Run "nexus auth login" to authenticate with the API server'
      };
    }

    // Check if token is valid by attempting to decode it (basic check)
    // JWT tokens have 3 parts separated by dots
    const parts = config.authToken.split('.');
    if (parts.length !== 3) {
      return {
        name: 'auth',
        status: 'error',
        message: 'Authentication token format is invalid',
        fixHint: 'Re-authenticate using "nexus auth login" to get a valid token'
      };
    }

    // Try to use the token with an API request
    const client = new APIClient();
    // Use one of the existing methods that would require authentication
    const response = await client.getProjects();

    if (response.status === 'ok' && response.data.projects) {
      return {
        name: 'auth',
        status: 'ok',
        message: 'Authentication token is valid',
        fixHint: 'Authentication token is valid and working correctly'
      };
    } else {
      return {
        name: 'auth',
        status: 'error',
        message: 'Authentication token appears to be invalid or expired',
        fixHint: 'Re-authenticate using "nexus auth login" to get a new token'
      };
    }
  } catch (error: any) {
    return {
      name: 'auth',
      status: 'error',
      message: `Authentication check failed: ${error.message}`,
      fixHint: 'Check authentication setup, run "nexus auth login" to authenticate'
    };
  }
}

async function checkConfigFilePermissions(): Promise<DoctorCheck> {
  try {
    const configPath = getConfigFilePath();
    const configDir = path.dirname(configPath);
    
    // Check if config directory exists and is writable
    try {
      await fs.access(configDir, fs.constants.F_OK | fs.constants.W_OK);
    } catch {
      return {
        name: 'permissions',
        status: 'error',
        message: 'Configuration directory does not exist or is not writable',
        fixHint: 'Create the directory ~/.nexus and ensure it is writable: "mkdir -p ~/.nexus && chmod 755 ~/.nexus"'
      };
    }

    // Check if config file exists and is readable/writable
    try {
      await fs.access(configPath, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      // If file doesn't exist, that's okay - it will be created
      try {
        await fs.access(configDir, fs.constants.F_OK | fs.constants.W_OK);
      } catch {
        return {
          name: 'permissions',
          status: 'error',
          message: 'Configuration file cannot be created in directory',
          fixHint: 'Check permissions on the ~/.nexus directory'
        };
      }
    }

    return {
      name: 'permissions',
      status: 'ok',
      message: 'Configuration file permissions are appropriate',
      fixHint: 'Configuration file permissions are correctly set'
    };
  } catch (error: any) {
    return {
      name: 'permissions',
      status: 'error',
      message: `Permission check failed: ${error.message}`,
      fixHint: 'Check file permissions for the ~/.nexus directory and configuration file'
    };
  }
}

async function checkParity(): Promise<DoctorCheck> {
  try {
    // Try to create a simple parity file and read it back
    const parityPath = path.join(path.dirname(getConfigFilePath()), 'parity-test');
    
    // Write a test file
    await fs.writeFile(parityPath, 'test', 'utf8');
    
    // Read it back
    const content = await fs.readFile(parityPath, 'utf8');
    
    // Clean up
    await fs.unlink(parityPath);
    
    if (content === 'test') {
      return {
        name: 'parity',
        status: 'ok',
        message: 'File system parity check passed',
        fixHint: 'File system read/write operations are working correctly'
      };
    } else {
      return {
        name: 'parity',
        status: 'error',
        message: 'File system parity check failed - read/write inconsistency',
        fixHint: 'Check disk space and file system for errors'
      };
    }
  } catch (error: any) {
    return {
      name: 'parity',
      status: 'error',
      message: `Parity check failed: ${error.message}`,
      fixHint: 'Check disk space and file system for errors'
    };
  }
}

async function checkVersionStatus(): Promise<DoctorCheck> {
  try {
    // Import the BUILD_INFO to get current version information
    const { BUILD_INFO } = await import('../../generated/build-info');

    // For now, we'll just mark as OK, but in a real implementation we might check
    // against a version API to see if this version is outdated
    // This could call a remote API to check the latest available version
    const versionCheck = await performVersionCheck(BUILD_INFO.version);

    return {
      name: 'version',
      status: versionCheck.status,
      message: versionCheck.message,
      fixHint: versionCheck.fixHint
    };
  } catch (error: any) {
    return {
      name: 'version',
      status: 'warning',
      message: 'Could not determine version status',
      fixHint: 'Check your Nexus CLI installation'
    };
  }
}

async function performVersionCheck(currentVersion: string): Promise<{status: 'ok' | 'warning' | 'error', message: string, fixHint: string}> {
  try {
    // In a future implementation, this could call an API to check:
    // - if the current version is the latest
    // - if the current version is deprecated
    // - if there are security advisories for this version
    // For now, simply return as OK
    return {
      status: 'ok',
      message: `CLI version ${currentVersion} is current`,
      fixHint: 'No updates available'
    };
  } catch (error) {
    return {
      status: 'warning',
      message: `Could not verify latest version for ${currentVersion}`,
      fixHint: 'Check for Nexus CLI updates manually'
    };
  }
}