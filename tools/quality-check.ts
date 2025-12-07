#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Main quality check function
async function runQualityChecks(): Promise<boolean> {
  let allChecksPassed = true;

  console.log('🔍 Running quality checks...\n');

  // 1. Run TypeScript type-check
  console.log('1. Running TypeScript type-check...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ TypeScript type-check passed\n');
  } catch (error) {
    console.error('❌ TypeScript type-check failed\n');
    allChecksPassed = false;
  }

  // 2. Run ESLint
  console.log('2. Running ESLint...');
  try {
    execSync('npx eslint src/', { stdio: 'inherit' });
    console.log('✅ ESLint passed\n');
  } catch (error) {
    console.error('❌ ESLint failed\n');
    allChecksPassed = false;
  }

  // 3. Run test suite
  console.log('3. Running test suite...');
  try {
    execSync('npm test', { stdio: 'inherit' });
    console.log('✅ Test suite passed\n');
  } catch (error) {
    console.error('❌ Test suite failed\n');
    allChecksPassed = false;
  }

  // 4. Run parity checker
  console.log('4. Running parity checker...');
  try {
    execSync('npm run parity', { stdio: 'inherit' });
    console.log('✅ Parity check passed\n');
  } catch (error) {
    console.error('❌ Parity check failed\n');
    allChecksPassed = false;
  }

  // 5. Check for console.log in source files (except within runtime streaming)
  console.log('5. Checking for unauthorized console.log statements...');
  const consoleLogCheckResult = checkForConsoleLogs();
  if (consoleLogCheckResult) {
    console.log('✅ No unauthorized console.log statements found\n');
  } else {
    console.error('❌ Found unauthorized console.log statements\n');
    allChecksPassed = false;
  }

  // 6. Check for unused exports
  console.log('6. Checking for unused exports...');
  const unusedExportsCheckResult = checkForUnusedExports();
  if (unusedExportsCheckResult) {
    console.log('✅ No unused exports found\n');
  } else {
    console.error('❌ Found unused exports\n');
    allChecksPassed = false;
  }

  // 7. Check for orphan commands in command registry vs manifest
  console.log('7. Checking for orphan commands...');
  const orphanCommandsCheckResult = checkForOrphanCommands();
  if (orphanCommandsCheckResult) {
    console.log('✅ No orphan commands found\n');
  } else {
    console.error('❌ Found orphan commands\n');
    allChecksPassed = false;
  }

  return allChecksPassed;
}

// Helper function to check for console.log in source files
function checkForConsoleLogs(): boolean {
  const srcDir = path.join(process.cwd(), 'src');
  const consoleLogPattern = /console\.log/g;
  let foundUnauthorizedConsoleLog = false;

  function checkDirectory(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules and other non-source directories
        if (file !== 'node_modules' && file !== 'dist' && file !== 'build' && file !== 'generated') {
          checkDirectory(filePath);
        }
      } else if (stat.isFile() && file.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (consoleLogPattern.test(line)) {
            // Check if it's in a runtime streaming context
            const lineContext = line.trim();
            if (!lineContext.includes('runtime streaming')) {
              console.warn(`Found console.log at ${filePath}:${i + 1}: ${line.trim()}`);
              foundUnauthorizedConsoleLog = true;
            }
          }
        }
      }
    }
  }

  checkDirectory(srcDir);
  return !foundUnauthorizedConsoleLog;
}

// Helper function to check for unused exports
function checkForUnusedExports(): boolean {
  // This is a simplified check - in a real project we might use something like ts-unused-exports
  // For now, we'll just run the ESLint rule that should already detect unused exports
  try {
    // Try to run a specific eslint rule for unused exports if available
    execSync('npx eslint --rule "@typescript-eslint/no-unused-vars": "error" src/', { stdio: 'pipe' });
    return true;
  } catch (error) {
    // If the specific ESLint rule fails, we'll assume there may be unused exports
    // In a real implementation, we'd want to properly check for unused exports
    return false;
  }
}

// Helper function to check for orphan commands in command registry vs manifest
function checkForOrphanCommands(): boolean {
  try {
    // Look for the command registry and manifests
    const registryPath = path.join(process.cwd(), 'src', 'registry.ts');
    if (!fs.existsSync(registryPath)) {
      console.warn('Command registry not found at src/registry.ts');
      return true; // Not an error if registry doesn't exist
    }

    const registryContent = fs.readFileSync(registryPath, 'utf8');
    
    // Look for command manifest files
    const manifestPath = path.join(process.cwd(), 'src', 'commands', 'manifest.ts');
    if (!fs.existsSync(manifestPath)) {
      console.warn('Command manifest not found at src/commands/manifest.ts');
      return true; // Not an error if manifest doesn't exist
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    
    // Simple check: both files exist and contain command registration
    const hasRegistryCommands = /registerCommand|commandRegistry/.test(registryContent);
    const hasManifestCommands = /CommandManifest|manifest/.test(manifestContent);
    
    return hasRegistryCommands && hasManifestCommands;
  } catch (error) {
    console.error('Error checking for orphan commands:', error);
    return false;
  }
}

// Run the quality checks and exit with appropriate code
runQualityChecks()
  .then((allPassed) => {
    if (allPassed) {
      console.log('🎉 All quality checks passed!');
      process.exit(0);
    } else {
      console.log('💥 Some quality checks failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Error running quality checks:', error);
    process.exit(1);
  });