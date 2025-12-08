#!/usr/bin/env node
// Script to fix module import extensions for ESM compatibility
// This adds .js extensions to relative imports in compiled JavaScript files

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to fix import extensions in a single file
function fixImportExtensions(filePath) {
  if (!filePath.endsWith('.js')) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace relative imports like `from './parser'` or `from '../parser'` with `.js` extension
  const importRegex = /(from\s+["'](\.{1,2}\/[^"']*))(["'])/g;

  let newContent = content.replace(importRegex, (match, p1, p2, p3) => {
    // If the path already ends with an extension, skip it
    if (/\.\w+$/.test(p2)) {
      return match;
    }

    // Check if the directory exists and has an index.js file
    const dirPath = path.resolve(path.dirname(filePath), p2);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const indexPath = path.join(dirPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        // Change from './parser' to './parser/index.js'
        return p1 + '/index.js' + p3;
      }
    }

    return p1 + '.js' + p3;
  });

  // Also handle import statements that don't use 'from' but are still relative
  const importRegex2 = /(import\s+["'](\.{1,2}\/[^"']*))(["'])/g;
  newContent = newContent.replace(importRegex2, (match, p1, p2, p3) => {
    // If the path already ends with an extension, skip it
    if (/\.\w+$/.test(p2)) {
      return match;
    }

    // Check if the directory exists and has an index.js file
    const dirPath = path.resolve(path.dirname(filePath), p2);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const indexPath = path.join(dirPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        // Change from './parser' to './parser/index.js'
        return p1 + '/index.js' + p3;
      }
    }

    return p1 + '.js' + p3;
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed import extensions in ${filePath}`);
  }
}

// Function to recursively traverse directory and process files
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath); // Recursively process subdirectory
    } else if (stat.isFile() && item.endsWith('.js')) {
      fixImportExtensions(fullPath);
    }
  }
}

// Get the directory path to process (default to dist/)
const targetDir = process.argv[2] || './dist';

if (!fs.existsSync(targetDir)) {
  console.error(`Directory does not exist: ${targetDir}`);
  process.exit(1);
}

console.log(`Processing directory: ${targetDir}`);
processDirectory(targetDir);
console.log('Module extension fix complete.');