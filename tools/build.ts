import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import pkg from 'pkg';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

async function build() {
  console.log('Starting build process...');
  
  // First build TypeScript
  console.log('Compiling TypeScript...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Create dist directory if it doesn't exist
  const distDir = join(process.cwd(), 'dist');
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }
  
  // Copy assets that need to be included in the binary
  const assetsDir = join(distDir, 'assets');
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true });
  }
  
  // Copy manifest and schema assets
  copyFileSync(join(process.cwd(), 'ui_map.json'), join(assetsDir, 'ui_map.json'));
  copyFileSync(join(process.cwd(), 'package.json'), join(assetsDir, 'package.json'));
  
  // Get current git hash
  let gitHash = 'unknown';
  try {
    gitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    console.log('Could not retrieve git hash, using "unknown"');
  }
  
  // Create build info file
  const buildInfo = {
    version: packageJson.version,
    gitHash,
    buildDate: new Date().toISOString(),
    platform: process.platform,
    minimumBackendVersion: packageJson.minimumBackendVersion || '1.0.0',
    recommendedBackendVersion: packageJson.recommendedBackendVersion || '1.0.0'
  };
  
  const buildInfoPath = join(process.cwd(), 'src', 'generated', 'build-info.ts');
  if (!existsSync(join(process.cwd(), 'src', 'generated'))) {
    mkdirSync(join(process.cwd(), 'src', 'generated'), { recursive: true });
  }
  
  const buildInfoContent = `// Auto-generated file
export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)};
`;
  writeFileSync(buildInfoPath, buildInfoContent);
  
  // The build info is already compiled with the main project build
  // No additional compilation needed here
  
  console.log('Creating standalone binaries...');
  
  // Define targets
  const targets = [
    { platform: 'linux', arch: 'x64', name: 'nexus-linux-x64' },
    { platform: 'macos', arch: 'arm64', name: 'nexus-macos-arm64' },
    { platform: 'win', arch: 'x64', name: 'nexus-windows-x64.exe' }
  ];
  
  // Build for each target
  for (const target of targets) {
    console.log(`Building for ${target.platform}-${target.arch}...`);
    
    const binaryName = target.name;
    const outputPath = join(distDir, binaryName);
    
    // Use pkg to create standalone binary
    try {
      await pkg.exec([
        'dist/main.js',  // Entry point after TypeScript compilation
        '--targets', `${target.platform}-${target.arch}`,
        '--output', outputPath,
        '--no-bytecode',
        '--public'
      ]);
      
      console.log(`Successfully built: ${binaryName}`);
    } catch (error) {
      console.error(`Failed to build for ${target.platform}-${target.arch}:`, error);
      throw error;
    }
  }
  
  console.log('Build process completed successfully!');
}

build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});