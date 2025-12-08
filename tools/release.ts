import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { generateReleaseNotes } from './changelog';

// Check if working directory is clean
function isWorkingDirectoryClean(): boolean {
  try {
    const result = execSync('git status --porcelain', { encoding: 'utf-8' });
    return result.trim().length === 0;
  } catch (error) {
    console.error('Error checking git status:', error);
    return false;
  }
}

// Run quality gates
function runQualityGates(): boolean {
  try {
    execSync('ts-node tools/quality-check.ts', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Quality gates failed:', error);
    return false;
  }
}

// Prompt for release type
function promptForReleaseType(): 'major' | 'minor' | 'patch' {
  // For automation purposes, we'll check for an environment variable first
  // Otherwise, we'll use command line arguments
  const releaseType = process.argv[2] as 'major' | 'minor' | 'patch' || 'patch';
  
  if (['major', 'minor', 'patch'].includes(releaseType)) {
    return releaseType as 'major' | 'minor' | 'patch';
  } else {
    console.error(`Invalid release type: ${releaseType}. Use major, minor, or patch.`);
    process.exit(1);
  }
}

// Bump version
function bumpVersion(releaseType: 'major' | 'minor' | 'patch'): string {
  try {
    execSync(`ts-node tools/bump-version.ts --${releaseType}`, { stdio: 'inherit' });
    
    // Get the new version from package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('Error bumping version:', error);
    process.exit(1);
  }
}

// Build binaries
function buildBinaries(): void {
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error building binaries:', error);
    process.exit(1);
  }
}

// Write release artifacts
function writeReleaseArtifacts(version: string): void {
  // Create release directory
  const releaseDir = path.join(process.cwd(), 'release', version);
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
  }
  
  // Copy built binaries to release directory
  // This assumes the build process creates a dist directory
  const distDir = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    for (const file of files) {
      const srcPath = path.join(distDir, file);
      const destPath = path.join(releaseDir, file);
      
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  // Generate release notes
  const releaseNotes = generateReleaseNotes();
  fs.writeFileSync(path.join(releaseDir, 'RELEASE_NOTES.md'), releaseNotes);
  
  // Create a summary JSON file
  const summary = {
    version,
    artifacts: fs.readdirSync(releaseDir).filter(f => f !== 'RELEASE_NOTES.md'),
    timestamp: new Date().toISOString(),
    status: 'ok'
  };
  
  fs.writeFileSync(path.join(releaseDir, 'release-summary.json'), JSON.stringify(summary, null, 2));
}

// Main release function
function runRelease(): void {
  console.log('🚀 Starting release process...\n');
  
  // 1. Verify working directory is clean
  console.log('1. Verifying working directory is clean...');
  if (!isWorkingDirectoryClean()) {
    console.error('❌ Working directory is not clean. Please commit all changes before releasing.');
    process.exit(1);
  }
  console.log('✅ Working directory is clean\n');
  
  // 2. Run quality gates
  console.log('2. Running quality gates...');
  if (!runQualityGates()) {
    console.error('❌ Quality gates failed. Cannot proceed with release.');
    process.exit(1);
  }
  console.log('✅ All quality gates passed\n');
  
  // 3. Prompt for release type
  console.log('3. Determining release type...');
  const releaseType = promptForReleaseType();
  console.log(`✅ Release type: ${releaseType}\n`);
  
  // 4. Bump version
  console.log('4. Bumping version...');
  const newVersion = bumpVersion(releaseType);
  console.log(`✅ Version bumped to: ${newVersion}\n`);
  
  // 5. Generate changelog
  console.log('5. Generating changelog...');
  try {
    execSync('ts-node tools/changelog.ts', { stdio: 'inherit' });
    console.log('✅ Changelog generated\n');
  } catch (error) {
    console.error('❌ Error generating changelog:', error);
    process.exit(1);
  }
  
  // 6. Build binaries
  console.log('6. Building binaries...');
  buildBinaries();
  console.log('✅ Binaries built successfully\n');
  
  // 7. Write release artifacts
  console.log('7. Writing release artifacts...');
  writeReleaseArtifacts(newVersion);
  console.log(`✅ Release artifacts written to: release/${newVersion}\n`);
  
  // 8. Create Git tag for the release
  console.log('8. Creating Git tag...');
  try {
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
    console.log(`✅ Git tag v${newVersion} created\n`);
  } catch (error) {
    console.error('❌ Error creating Git tag:', error);
    process.exit(1);
  }
  
  console.log(`🎉 Release ${newVersion} completed successfully!`);
  console.log(`📁 Artifacts are available in: release/${newVersion}/`);
}

// Run the release process
runRelease();