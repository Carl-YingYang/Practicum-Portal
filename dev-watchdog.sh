#!/bin/bash
cd /home/z/my-project
while true; do
  if ! lsof -ti:3000 >/dev/null 2>&1; then
    bun run dev >> dev.log 2>&1 &
    SERVER_PID=$!
    sleep 12
  else
    sleep 20
  fi
done
