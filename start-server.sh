#!/bin/bash
set -e

echo "🚀 Starting Next.js standalone server..."

# Find the standalone directory
STANDALONE_DIR=$(find .next/standalone -name 'server.js' -type f | head -1 | xargs dirname)
echo "📁 Server directory: $STANDALONE_DIR"

# Copy static files if not already there
if [ -d ".next/static" ]; then
  echo "📦 Copying .next/static to standalone build..."
  cp -r .next/static "$STANDALONE_DIR/.next/" 2>/dev/null || true
fi

if [ -d "public" ]; then
  echo "📦 Copying public to standalone build..."
  cp -r public "$STANDALONE_DIR/" 2>/dev/null || true
fi

# Change to standalone directory and start server
cd "$STANDALONE_DIR"
echo "✅ Starting server on port ${PORT:-3000}..."
exec node server.js
