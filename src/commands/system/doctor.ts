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
        message: 'Missing API base URL in configuration'
      };
    }
    
    return {
      name: 'config',
      status: 'ok',
      message: 'Configuration loaded successfully'
    };
  } catch (error: any) {
    return {
      name: 'config',
      status: 'error',
      message: `Configuration error: ${error.message}`
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
        message: 'API connectivity established'
      };
    } else {
      return {
        name: 'api',
        status: 'warning',
        message: `API returned status ${response.status}`
      };
    }
  } catch (error: any) {
    return {
      name: 'api',
      status: 'warning',
      message: `API connectivity failed: ${error.message}`
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
        message: 'No authentication token set'
      };
    }
    
    // Check if token is valid by attempting to decode it (basic check)
    // JWT tokens have 3 parts separated by dots
    const parts = config.authToken.split('.');
    if (parts.length !== 3) {
      return {
        name: 'auth',
        status: 'error',
        message: 'Authentication token format is invalid'
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
        message: 'Authentication token is valid'
      };
    } else {
      return {
        name: 'auth',
        status: 'error',
        message: 'Authentication token appears to be invalid or expired'
      };
    }
  } catch (error: any) {
    return {
      name: 'auth',
      status: 'error',
      message: `Authentication check failed: ${error.message}`
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
        message: 'Configuration directory does not exist or is not writable'
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
          message: 'Configuration file cannot be created in directory'
        };
      }
    }
    
    return {
      name: 'permissions',
      status: 'ok',
      message: 'Configuration file permissions are appropriate'
    };
  } catch (error: any) {
    return {
      name: 'permissions',
      status: 'error',
      message: `Permission check failed: ${error.message}`
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
        message: 'File system parity check passed'
      };
    } else {
      return {
        name: 'parity',
        status: 'error',
        message: 'File system parity check failed - read/write inconsistency'
      };
    }
  } catch (error: any) {
    return {
      name: 'parity',
      status: 'error',
      message: `Parity check failed: ${error.message}`
    };
  }
}