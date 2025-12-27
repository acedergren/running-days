#!/bin/bash
# Build for Cloudflare Pages deployment

set -e

# Backup original config
cp svelte.config.js svelte.config.js.bak

# Use Cloudflare config
cp svelte.config.cloudflare.js svelte.config.js

# Build
npm run build

# Restore original config
mv svelte.config.js.bak svelte.config.js

echo "Build complete! Output in ./build"
