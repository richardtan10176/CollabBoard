#!/bin/bash

# Health Check Script
# This script monitors the health of all services

set -e

echo "🏥 CollabBoard Health Check"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker-compose file exists
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found"
    exit 1
fi

# Check container status
print_status "Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo ""

# Check PostgreSQL
print_status "Checking PostgreSQL..."
if docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres -d collabboard > /dev/null 2>&1; then
    print_success "PostgreSQL is healthy"
else
    print_error "PostgreSQL is not responding"
fi

# Check Backend API
print_status "Checking Backend API..."
if curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    print_success "Backend API is healthy"
else
    print_error "Backend API is not responding"
fi

# Check Frontend
print_status "Checking Frontend..."
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is healthy"
else
    print_error "Frontend is not responding"
fi

# Check NGINX
print_status "Checking NGINX..."
if curl -f -s http://localhost:80 > /dev/null 2>&1; then
    print_success "NGINX is healthy"
else
    print_error "NGINX is not responding"
fi

echo ""

# Check database tables
print_status "Checking database tables..."
if docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d collabboard -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    print_success "Database tables are accessible"
else
    print_error "Database tables are not accessible"
fi

echo ""
print_status "Health check completed!"
