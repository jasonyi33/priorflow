#!/bin/bash
# Start both backend and frontend dev servers.
# Usage: ./scripts/dev_start.sh

set -e

echo "=== PriorFlow Dev Startup ==="

# Check for .env
if [ ! -f .env ]; then
    echo "WARNING: No .env file found. Copy .env.example to .env and fill in values."
    echo "  cp .env.example .env"
fi

# Start backend
echo ""
echo "Starting FastAPI backend on port ${BACKEND_PORT:-8000}..."
uvicorn server.main:app --reload --port "${BACKEND_PORT:-8000}" &
BACKEND_PID=$!

# Start frontend (if frontend/package.json exists)
if [ -f frontend/package.json ]; then
    echo "Starting Next.js frontend on port ${FRONTEND_PORT:-3000}..."
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    cd ..
else
    echo "Frontend not initialized yet. Run: cd frontend && npx create-next-app@latest ."
    FRONTEND_PID=""
fi

echo ""
echo "=== Servers Running ==="
echo "  Backend:  http://localhost:${BACKEND_PORT:-8000}"
echo "  API Docs: http://localhost:${BACKEND_PORT:-8000}/docs"
if [ -n "$FRONTEND_PID" ]; then
    echo "  Frontend: http://localhost:${FRONTEND_PORT:-3000}"
fi
echo ""
echo "Press Ctrl+C to stop all servers."

# Wait and handle cleanup
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
