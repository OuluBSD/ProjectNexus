import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Function to get the last Git tag
function getLastTag(): string {
  try {
    // Get the most recent tag
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
    return lastTag;
  } catch (error) {
    // If no tags exist yet, use the initial commit
    return execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf-8' }).trim();
  }
}

// Function to get commits since the last tag
function getCommitsSinceLastTag(lastTag: string): Array<{hash: string, message: string, type: string, scope: string | null, description: string, isBreaking: boolean}> {
  const commits: Array<{hash: string, message: string, type: string, scope: string | null, description: string, isBreaking: boolean}> = [];
  
  // Get commit list since last tag
  const commitList = execSync(`git log ${lastTag}..HEAD --pretty=format:"%H||%s"`, { encoding: 'utf-8' }).trim();
  
  if (!commitList) {
    return commits; // No commits since last tag
  }
  
  const lines = commitList.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const [hash, message] = line.split('||');
    if (!hash || !message) continue;
    
    // Parse commit message according to conventional commits
    // Format: type(scope): description
    const match = message.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.*)/);
    let type = '';
    let scope: string | null = null;
    let description = message; // Default to full message if parsing fails
    let isBreaking = false;
    
    if (match) {
      type = match[1].toLowerCase();
      scope = match[2] || null;
      description = match[3];
      
      // Check if it's a breaking change (has ! in the header)
      if (message.includes('!')) {
        isBreaking = true;
      }
    } else {
      // If not conventional format, try to classify based on keywords
      if (message.toLowerCase().includes('feat')) {
        type = 'feat';
      } else if (message.toLowerCase().includes('fix')) {
        type = 'fix';
      } else if (message.toLowerCase().includes('perf')) {
        type = 'perf';
      } else if (message.toLowerCase().includes('refactor')) {
        type = 'refactor';
      } else {
        type = 'chore'; // Default to chore for unknown types
      }
    }
    
    commits.push({
      hash: hash.substring(0, 7), // Short hash
      message,
      type,
      scope,
      description,
      isBreaking
    });
  }
  
  return commits;
}

// Function to format the changelog
function formatChangelog(commits: Array<{hash: string, message: string, type: string, scope: string | null, description: string, isBreaking: boolean}>): string {
  const features = commits.filter(c => c.type === 'feat');
  const fixes = commits.filter(c => c.type === 'fix');
  const perfChanges = commits.filter(c => c.type === 'perf');
  const refactorChanges = commits.filter(c => c.type === 'refactor');
  const breakingChanges = commits.filter(c => c.isBreaking);
  const others = commits.filter(c => !['feat', 'fix', 'perf', 'refactor'].includes(c.type) && !c.isBreaking);
  
  let changelog = `## ${new Date().toISOString().split('T')[0]} (Unreleased)\n\n`;
  
  if (breakingChanges.length > 0) {
    changelog += '### Breaking Changes\n\n';
    for (const commit of breakingChanges) {
      changelog += `- **${commit.type}**${commit.scope ? `(${commit.scope})` : ''}: ${commit.description} (${commit.hash})\n`;
    }
    changelog += '\n';
  }
  
  if (features.length > 0) {
    changelog += '### Features\n\n';
    for (const commit of features) {
      changelog += `- ${commit.scope ? `**${commit.scope}**: ` : ''}${commit.description} (${commit.hash})\n`;
    }
    changelog += '\n';
  }
  
  if (fixes.length > 0) {
    changelog += '### Fixes\n\n';
    for (const commit of fixes) {
      changelog += `- ${commit.scope ? `**${commit.scope}**: ` : ''}${commit.description} (${commit.hash})\n`;
    }
    changelog += '\n';
  }
  
  if (perfChanges.length > 0) {
    changelog += '### Performance\n\n';
    for (const commit of perfChanges) {
      changelog += `- ${commit.scope ? `**${commit.scope}**: ` : ''}${commit.description} (${commit.hash})\n`;
    }
    changelog += '\n';
  }
  
  if (refactorChanges.length > 0) {
    changelog += '### Refactoring\n\n';
    for (const commit of refactorChanges) {
      changelog += `- ${commit.scope ? `**${commit.scope}**: ` : ''}${commit.description} (${commit.hash})\n`;
    }
    changelog += '\n';
  }
  
  if (others.length > 0) {
    changelog += '### Other Changes\n\n';
    for (const commit of others) {
      changelog += `- **${commit.type}**${commit.scope ? `(${commit.scope})` : ''}: ${commit.description} (${commit.hash})\n`;
    }
    changelog += '\n';
  }
  
  return changelog;
}

// Function to update the changelog file
function updateChangelogFile(newChangelog: string): void {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  
  let existingContent = '';
  if (fs.existsSync(changelogPath)) {
    existingContent = fs.readFileSync(changelogPath, 'utf8');
  } else {
    // Create initial changelog file structure
    existingContent = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  }
  
  // Insert new changelog at the beginning, right after the title
  const updatedContent = existingContent.replace(
    /(All notable changes to this project will be documented in this file\.\s*)/,
    `$1\n${newChangelog}`
  );
  
  fs.writeFileSync(changelogPath, updatedContent);
}

// Main function to generate changelog
export function generateReleaseNotes(): string {
  console.log('Getting last Git tag...');
  const lastTag = getLastTag();
  console.log(`Last tag: ${lastTag}`);
  
  console.log('Getting commits since last tag...');
  const commits = getCommitsSinceLastTag(lastTag);
  console.log(`Found ${commits.length} commits`);
  
  if (commits.length === 0) {
    console.log('No commits since last tag, skipping changelog generation');
    return '';
  }
  
  console.log('Formatting changelog...');
  const changelog = formatChangelog(commits);
  
  console.log('Updating changelog file...');
  updateChangelogFile(changelog);
  
  console.log('Changelog generated successfully!');
  return changelog;
}

// If running as a script, generate the changelog
if (require.main === module) {
  try {
    generateReleaseNotes();
  } catch (error) {
    console.error('Error generating changelog:', error);
    process.exit(1);
  }
}