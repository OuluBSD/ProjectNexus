// tests/e2e/qwen-file-probe.test.ts
// End-to-End test for Qwen File Probe functionality

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test configuration
const TEST_PROJECT_PATH = '/home/sblo/Dev/AgentManager/guess-the-number'; // Using existing project
const PROBE_DIR = '.nexus/qwen-probe';
const DEFAULT_PROBE_FILE = '.nexus-qwen-probe-ok.txt';

describe('Qwen File Probe E2E Test', () => {
  let runId: string;
  let probeFilePath: string;
  
  beforeAll(() => {
    runId = `test-${Date.now()}`;
    probeFilePath = path.join(TEST_PROJECT_PATH, PROBE_DIR, DEFAULT_PROBE_FILE);
  });
  
  afterAll(async () => {
    // Clean up the probe file after test
    try {
      await fs.unlink(probeFilePath);
      // Remove the probe directory if empty
      const probeDirPath = path.join(TEST_PROJECT_PATH, PROBE_DIR);
      const dirContents = await fs.readdir(probeDirPath);
      if (dirContents.length === 0) {
        await fs.rmdir(probeDirPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should create probe file when Qwen probe command is executed', async () => {
    // First, ensure the probe file does not exist
    try {
      await fs.access(probeFilePath);
      // If the file exists, remove it
      await fs.unlink(probeFilePath);
    } catch (error) {
      // File doesn't exist, which is expected
    }

    // Execute the CLI command
    const command = `npx tsx dist/main.js system chat-qwen-probe --run-id ${runId} --project-path ${TEST_PROJECT_PATH}`;
    
    let stdout: string, stderr: string, exitCode: number;
    
    try {
      const result = await execAsync(command);
      stdout = result.stdout;
      stderr = result.stderr;
      exitCode = 0; // execAsync doesn't throw on non-zero exit codes in this context
    } catch (error: any) {
      stdout = error.stdout || '';
      stderr = error.stderr || '';
      exitCode = error.code || 1;
    }
    
    // Verify the command completed with exit code 0
    expect(exitCode).toBe(0);
    
    // Wait briefly for the file operation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the probe file now exists
    await expect(fs.access(probeFilePath)).resolves.not.toThrow();
    
    // Read and verify the content of the probe file
    const content = await fs.readFile(probeFilePath, 'utf8');
    
    // Verify content includes required elements
    expect(content).toContain(`RUN_ID=${runId}`);
    expect(content).toContain('BACKEND=QWEN');
    expect(content).toContain('TIMESTAMP=');
    
    console.log(`✅ Qwen file probe test passed. Created file: ${probeFilePath}`);
    console.log(`📁 File content: ${content}`);
  }, 30000); // 30 second timeout to allow for backend operations

  test('should return appropriate error when project path does not exist', async () => {
    const nonExistentPath = '/non/existent/path';
    const testRunId = `test-error-${Date.now()}`;
    
    const command = `npx tsx dist/main.js system chat-qwen-probe --run-id ${testRunId} --project-path ${nonExistentPath}`;
    
    try {
      await execAsync(command);
      // If we reach this point, the command didn't fail as expected
      fail('Expected command to fail with non-existent path');
    } catch (error: any) {
      // Command should fail, which is expected
      expect(error.code).not.toBe(0);
      console.log(`✅ Error handling test passed. Command failed as expected for path: ${nonExistentPath}`);
    }
  }, 15000);
});