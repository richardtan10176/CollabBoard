#!/bin/bash

# Database Reset Script
# This script safely resets the database to a clean state

set -e

echo "🔄 Resetting database to clean state..."

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

# Confirmation prompt
echo "⚠️  This will delete ALL data in the database!"
echo "Are you sure you want to continue? (yes/no)"
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    print_warning "Database reset cancelled"
    exit 0
fi

print_status "Stopping services..."
docker-compose -f docker-compose.prod.yml down postgres backend

print_status "Removing database volume..."
docker volume rm collabboard_postgres_data || true

print_status "Starting PostgreSQL..."
docker-compose -f docker-compose.prod.yml up -d postgres

print_status "Waiting for PostgreSQL to initialize..."
sleep 15

print_status "Starting backend..."
docker-compose -f docker-compose.prod.yml up -d backend

print_status "Waiting for services to be ready..."
sleep 10

# Run verification script
if [ -f "scripts/verify-db.sh" ]; then
    print_status "Verifying database initialization..."
    ./scripts/verify-db.sh
else
    print_warning "Verification script not found, skipping verification"
fi

print_success "Database reset completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   • Check application logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   • Test the application in your browser"
echo "   • Default login: admin/admin123 or user/user123"
