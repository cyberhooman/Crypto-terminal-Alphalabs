#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Next.js standalone server...');

// Find server.js in standalone build
function findServerJs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && entry.name === 'server.js') {
      return fullPath;
    }

    if (entry.isDirectory() && entry.name !== 'node_modules') {
      const result = findServerJs(fullPath);
      if (result) return result;
    }
  }

  return null;
}

const standaloneDir = path.join(process.cwd(), '.next', 'standalone');
console.log(`📁 Searching for server.js in: ${standaloneDir}`);

const serverJsPath = findServerJs(standaloneDir);

if (!serverJsPath) {
  console.error('❌ Could not find server.js in standalone build');
  process.exit(1);
}

const serverDir = path.dirname(serverJsPath);
console.log(`✅ Found server.js at: ${serverDir}`);

// Copy static files
const staticSrc = path.join(process.cwd(), '.next', 'static');
const staticDest = path.join(serverDir, '.next', 'static');

if (fs.existsSync(staticSrc)) {
  console.log('📦 Copying .next/static to standalone build...');
  try {
    execSync(`cp -r "${staticSrc}" "${path.dirname(staticDest)}/"`, { stdio: 'inherit' });
  } catch (e) {
    console.warn('⚠️  Failed to copy static files, they might already exist');
  }
}

// Copy public folder
const publicSrc = path.join(process.cwd(), 'public');
const publicDest = path.join(serverDir, 'public');

if (fs.existsSync(publicSrc)) {
  console.log('📦 Copying public to standalone build...');
  try {
    execSync(`cp -r "${publicSrc}" "${serverDir}/"`, { stdio: 'inherit' });
  } catch (e) {
    console.warn('⚠️  Failed to copy public files, they might already exist');
  }
}

// Change directory and start server
process.chdir(serverDir);
console.log(`✅ Starting server on port ${process.env.PORT || 3000}...`);
console.log(`🌐 Server directory: ${serverDir}`);

// Execute server.js
require(serverJsPath);
