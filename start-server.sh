#!/bin/bash
cd "$(find .next/standalone -name 'server.js' -type f | head -1 | xargs dirname)"
exec node server.js
