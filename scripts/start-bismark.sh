#!/bin/bash
# Bismark ERP auto-start script
# Runs on codespace boot via postStartCommand

cd /workspaces/bismark-v1

# Source bashrc to get bun in PATH
source ~/.bashrc 2>/dev/null
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Start Docker containers
echo "[start-bismark] Starting Docker..."
docker compose up -d 2>/dev/null
sleep 5

# Check if dev server is already running
if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
  echo "[start-bismark] Dev server already running"
  exit 0
fi

# Start dev server
echo "[start-bismark] Starting dev server..."
pkill -f "next dev" 2>/dev/null
sleep 1
nohup npx next dev -p 3000 > /tmp/bismark-dev.log 2>&1 &
echo "[start-bismark] Dev server started (PID: $!)"

# Wait for it to be ready
for i in $(seq 1 30); do
  sleep 2
  if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[start-bismark] Dev server is ready!"
    exit 0
  fi
done
echo "[start-bismark] Dev server failed to start in time"
