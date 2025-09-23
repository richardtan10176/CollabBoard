#!/bin/bash

# Database Verification Script
# This script verifies that the database is properly initialized

set -e

echo "🔍 Verifying database initialization..."

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

# Check if postgres container is running
if ! docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
    print_error "PostgreSQL container is not running"
    exit 1
fi

print_status "PostgreSQL container is running"

# Wait for postgres to be ready
print_status "Waiting for PostgreSQL to be ready..."
timeout 60 bash -c 'until docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres -d collabboard; do sleep 2; done'

# Check if required tables exist
print_status "Checking for required tables..."

REQUIRED_TABLES=("users" "documents" "document_versions" "active_sessions" "document_shares")

for table in "${REQUIRED_TABLES[@]}"; do
    if docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d collabboard -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
        print_success "Table '$table' exists and is accessible"
    else
        print_error "Table '$table' is missing or not accessible"
        exit 1
    fi
done

# Check if default users exist
print_status "Checking for default users..."

if docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d collabboard -c "SELECT COUNT(*) FROM users WHERE username IN ('admin', 'user');" | grep -q "2"; then
    print_success "Default users exist"
else
    print_warning "Default users may not exist"
fi

# Check if sample document exists
print_status "Checking for sample document..."

if docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d collabboard -c "SELECT COUNT(*) FROM documents WHERE title = 'Welcome to CollabBoard';" | grep -q "1"; then
    print_success "Sample document exists"
else
    print_warning "Sample document may not exist"
fi

print_success "Database verification completed successfully!"
echo ""
echo "📋 Database Status:"
echo "   • PostgreSQL: Running"
echo "   • Required tables: All present"
echo "   • Database ready for use"
