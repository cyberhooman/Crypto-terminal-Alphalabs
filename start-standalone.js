#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Next.js standalone server...');

// Find server.js in standalone build
function findServerJs(dir, depth = 0) {
  if (depth > 5) return null; // Prevent infinite recursion

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isFile() && entry.name === 'server.js') {
        return fullPath;
      }

      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const result = findServerJs(fullPath, depth + 1);
        if (result) return result;
      }
    }
  } catch (e) {
    console.warn(`⚠️  Could not read directory ${dir}:`, e.message);
  }

  return null;
}

const standaloneDir = path.join(process.cwd(), '.next', 'standalone');
console.log(`📁 Searching for server.js in: ${standaloneDir}`);

const serverJsPath = findServerJs(standaloneDir);

if (!serverJsPath) {
  console.error('❌ Could not find server.js in standalone build');
  console.error('Directory contents:', fs.readdirSync(standaloneDir));
  process.exit(1);
}

const serverDir = path.dirname(serverJsPath);
console.log(`✅ Found server.js at: ${serverDir}`);

// Helper function to copy recursively
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }

  // Create destination if it doesn't exist
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    if (process.platform === 'win32') {
      execSync(`xcopy /E /I /Y "${src}" "${dest}"`, { stdio: 'ignore' });
    } else {
      execSync(`cp -rf "${src}" "${dest}"`, { stdio: 'ignore' });
    }
    return true;
  } catch (e) {
    console.warn(`⚠️  Copy failed: ${e.message}`);
    return false;
  }
}

// Copy static files to standalone .next directory
const staticSrc = path.join(process.cwd(), '.next', 'static');
const nextDirInStandalone = path.join(serverDir, '.next');
const staticDest = path.join(nextDirInStandalone, 'static');

if (fs.existsSync(staticSrc) && !fs.existsSync(staticDest)) {
  console.log('📦 Copying .next/static to standalone build...');

  // Ensure .next directory exists in standalone
  if (!fs.existsSync(nextDirInStandalone)) {
    fs.mkdirSync(nextDirInStandalone, { recursive: true });
  }

  const copied = copyRecursive(staticSrc, staticDest);
  if (copied) {
    console.log('✅ Static files copied successfully');
  }
} else if (fs.existsSync(staticDest)) {
  console.log('✅ Static files already present');
} else {
  console.warn('⚠️  No static files found to copy');
}

// Copy public folder to standalone
const publicSrc = path.join(process.cwd(), 'public');
const publicDest = path.join(serverDir, 'public');

if (fs.existsSync(publicSrc) && !fs.existsSync(publicDest)) {
  console.log('📦 Copying public to standalone build...');
  const copied = copyRecursive(publicSrc, publicDest);
  if (copied) {
    console.log('✅ Public files copied successfully');
  }
} else if (fs.existsSync(publicDest)) {
  console.log('✅ Public files already present');
} else {
  console.log('ℹ️  No public folder to copy');
}

// Set environment variables for Next.js standalone server
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = '0.0.0.0'; // CRITICAL: Must listen on all interfaces for Railway

console.log(`🌐 Server configuration:`);
console.log(`   - Directory: ${serverDir}`);
console.log(`   - Port: ${process.env.PORT}`);
console.log(`   - Hostname: ${process.env.HOSTNAME} (forced for Railway)`);
console.log(`   - Node version: ${process.version}`);
console.log(`   - Platform: ${process.platform}`);

// Change to server directory
process.chdir(serverDir);
console.log(`✅ Changed directory to: ${process.cwd()}`);
console.log(`🚀 Starting Next.js server...`);
console.log(`⏳ Server should be ready in ~500ms...`);

// Execute server.js
try {
  require(serverJsPath);
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
