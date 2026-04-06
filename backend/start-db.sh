#!/bin/zsh
# Manual MongoDB start script for macOS
# This bypasses the brew services issue
# Run with: ./start-db.sh

echo "🛠️ Starting MongoDB manually..."
mongod --config $(brew --prefix)/etc/mongod.conf
