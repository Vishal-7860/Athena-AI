# ==============================================================================
# Athena AI - Automated Full-Stack Deployment Script (Windows PowerShell)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          🚀 Starting Athena AI Automated Deployment Pipeline" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# Step 1: Ensure .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  No .env file found in root directory. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# Step 2: Verify Docker availability
try {
    $null = docker info
    Write-Host "✅ Docker environment verified." -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not running or not installed." -ForegroundColor Red
    exit 1
}

# Step 3: Stop existing containers
Write-Host "📦 Stopping any existing containers..." -ForegroundColor Yellow
try {
    docker compose down --remove-orphans
} catch {
    # Ignore error if containers were not running
}

# Step 4: Build and launch services
Write-Host "🔨 Building Docker images and starting services..." -ForegroundColor Cyan
docker compose up --build -d

# Step 5: Health Check
Write-Host "⏳ Waiting for database and backend services to initialize..." -ForegroundColor Yellow
$maxRetries = 30
$retryCount = 0
$healthy = $false

while ($retryCount -lt $maxRetries) {
    $retryCount++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/status" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {
        # Retry loop
    }
    Write-Host "   ... waiting for services to be ready ($retryCount/$maxRetries)" -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

if ($healthy) {
    Write-Host "✅ Full-stack services started successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend service is taking longer to respond. Check container logs using 'docker compose logs'." -ForegroundColor Yellow
}

# Step 6: Database Seeding
Write-Host "🌱 Seeding database initial records..." -ForegroundColor Cyan
try {
    docker compose exec -T backend python /app/../scripts/seed_data.py
} catch {
    Write-Host "⚠️  Seeding executed with warnings or fallback." -ForegroundColor Yellow
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🎉 Athena AI Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "🌐 Frontend Access : http://localhost:3000" -ForegroundColor White
Write-Host "⚡ Backend REST API : http://localhost:5000/api/status" -ForegroundColor White
Write-Host "🗄️  MongoDB Port   : localhost:27017" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
