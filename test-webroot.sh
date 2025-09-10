#!/bin/bash

# Test Webroot Script for CollabBoard
# This script tests if the webroot is working after fixing the volume mount

set -e

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

echo "🧪 CollabBoard Webroot Tester"
echo "============================="

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

print_status "Testing webroot for $DOMAIN..."

# Create webroot directory
print_status "Creating webroot directory..."
sudo mkdir -p /var/www/certbot

# Set proper permissions
print_status "Setting proper permissions..."
sudo chown -R 1001:1001 /var/www/certbot
sudo chmod -R 755 /var/www/certbot

# Create a test file
print_status "Creating test challenge file..."
TEST_FILE="/var/www/certbot/test-challenge"
echo "test-challenge-content-$(date +%s)" | sudo tee "$TEST_FILE" > /dev/null

# Restart nginx to pick up the volume mount change
print_status "Restarting nginx with updated volume mount..."
sudo docker-compose -f docker-compose.prod.yml restart nginx

# Wait for nginx to restart
print_status "Waiting for nginx to restart..."
sleep 10

# Test if the challenge path is accessible
print_status "Testing challenge path accessibility..."
TEST_URL="http://$DOMAIN/.well-known/acme-challenge/test-challenge"

print_status "Test URL: $TEST_URL"

# Test with curl
RESPONSE=$(curl -s "$TEST_URL" || echo "FAILED")
print_status "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "test-challenge-content"; then
    print_success "✅ Challenge path is working correctly!"
    
    # Clean up test file
    sudo rm -f "$TEST_FILE"
    
    echo ""
    print_success "🎉 Webroot is now working! You can proceed with SSL setup."
    echo ""
    print_status "Run SSL setup again:"
    echo "  ./setup-ssl-webroot.sh"
    
else
    print_error "❌ Challenge path is still not working"
    echo ""
    print_warning "Debugging information:"
    echo "Test file exists: $(ls -la "$TEST_FILE" 2>/dev/null || echo "NO")"
    echo "Directory permissions: $(ls -ld /var/www/certbot)"
    echo "Directory contents: $(ls -la /var/www/certbot)"
    echo ""
    print_status "Checking nginx container..."
    sudo docker-compose -f docker-compose.prod.yml exec nginx ls -la /var/www/certbot || echo "Cannot access container"
    echo ""
    print_status "Checking nginx logs..."
    sudo docker-compose -f docker-compose.prod.yml logs nginx | tail -10
fi
