import fs from 'fs';
import path from 'path';

// Get command line arguments
const args = process.argv.slice(2);

// Parse arguments
let versionBump: 'major' | 'minor' | 'patch' | null = null;
let explicitVersion: string | null = null;

for (const arg of args) {
  if (arg === '--major') {
    versionBump = 'major';
  } else if (arg === '--minor') {
    versionBump = 'minor';
  } else if (arg === '--patch') {
    versionBump = 'patch';
  } else if (arg.startsWith('--version=')) {
    explicitVersion = arg.split('=')[1];
  }
}

if (!versionBump && !explicitVersion) {
  console.error('Usage: ts-node bump-version.ts [--major | --minor | --patch | --version=<version>]');
  process.exit(1);
}

// Read package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJsonRaw = fs.readFileSync(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonRaw);

// Get current version and bump it
let newVersion: string;

if (explicitVersion) {
  newVersion = explicitVersion;
} else {
  const [major, minor, patch] = packageJson.version.split('.').map(Number);
  
  if (versionBump === 'major') {
    newVersion = `${major + 1}.0.0`;
  } else if (versionBump === 'minor') {
    newVersion = `${major}.${minor + 1}.0`;
  } else if (versionBump === 'patch') {
    newVersion = `${major}.${minor}.${patch + 1}`;
  } else {
    console.error('Invalid version bump type');
    process.exit(1);
  }
}

// Add build metadata with git hash and build date
const gitHash = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
const buildDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
const versionWithMetadata = `${newVersion}+${gitHash}.${buildDate}`;

// Update package.json
packageJson.version = versionWithMetadata;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Ensure src/generated directory exists
const generatedDir = path.join(process.cwd(), 'src', 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

// Write build-info.ts
const buildInfoPath = path.join(generatedDir, 'build-info.ts');
const buildInfoContent = `// Auto-generated file - do not edit manually
export const BUILD_VERSION = "${versionWithMetadata}";
export const BUILD_GIT_HASH = "${gitHash}";
export const BUILD_DATE = "${buildDate}";
export const BUILD_TIMESTAMP = "${new Date().toISOString()}";
`;

fs.writeFileSync(buildInfoPath, buildInfoContent);

console.log(`Version updated to: ${versionWithMetadata}`);