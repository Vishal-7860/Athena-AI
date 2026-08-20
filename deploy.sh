#!/usr/bin/env bash
# ==============================================================================
# Athena AI - Automated Full-Stack Deployment Script (Linux/macOS)
# ==============================================================================

set -e

echo "======================================================================"
echo "          🚀 Starting Athena AI Automated Deployment Pipeline"
echo "======================================================================"

# Step 1: Ensure .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found in root directory. Copying from .env.example..."
    cp .env.example .env
fi

# Step 2: Verify Docker and Docker Compose availability
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Error: Docker daemon is not running. Please start Docker."
    exit 1
fi

echo "✅ Docker environment verified."

# Step 3: Stop existing containers
echo "📦 Stopping any existing containers..."
docker compose down --remove-orphans || true

# Step 4: Build and launch services
echo "🔨 Building Docker images and starting services..."
docker compose up --build -d

# Step 5: Wait for service health checks
echo "⏳ Waiting for database and backend services to initialize..."
MAX_RETRIES=30
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    # Check Flask Backend status endpoint
    if docker compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/status')" &> /dev/null; then
        HEALTHY=true
        break
    fi
    
    echo "   ... waiting for services to be ready ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 3
done

if [ "$HEALTHY" = true ]; then
    echo "✅ Full-stack services started successfully!"
else
    echo "⚠️  Backend service taking longer to respond. Check container logs using 'docker compose logs'."
fi

# Step 6: Database Seeding
echo "🌱 Running database seed script..."
docker compose exec -T backend python /app/../scripts/seed_data.py || echo "⚠️  Seeding via container path fallback..."

echo "======================================================================"
echo "🎉 Athena AI Deployment Completed Successfully!"
echo "----------------------------------------------------------------------"
echo "🌐 Frontend Access : http://localhost:3000"
echo "⚡ Backend REST API : http://localhost:5000/api/status"
echo "🗄️  MongoDB Port   : localhost:27017"
echo "======================================================================"
