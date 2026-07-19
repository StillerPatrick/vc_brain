#!/bin/sh
set -eu

cleanup() {
  kill "$api_pid" "$frontend_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

uvicorn main:app --reload &
api_pid=$!
npm run dev &
frontend_pid=$!

wait "$api_pid" "$frontend_pid"
