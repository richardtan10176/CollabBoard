#!/bin/bash

# SSL Status Check Script for CollabBoard
# This script checks the current SSL status and provides solutions

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

echo "🔍 CollabBoard SSL Status Check"
echo "==============================="

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

echo ""
print_status "=== CHECKING SSL STATUS ==="

# Check if SSL certificates exist
print_status "Checking for SSL certificates..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_success "✅ SSL certificate exists"
    CERT_EXISTS=true
else
    print_error "❌ SSL certificate does not exist"
    CERT_EXISTS=false
fi

# Check if nginx SSL directory has certificates
print_status "Checking nginx SSL directory..."
if [ -f "/etc/nginx/ssl/server.crt" ] && [ -f "/etc/nginx/ssl/server.key" ]; then
    print_success "✅ Nginx SSL certificates exist"
    NGINX_SSL=true
else
    print_error "❌ Nginx SSL certificates missing"
    NGINX_SSL=false
fi

# Check if nginx is running
print_status "Checking nginx status..."
if sudo docker-compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    print_success "✅ Nginx is running"
    NGINX_RUNNING=true
else
    print_error "❌ Nginx is not running"
    NGINX_RUNNING=false
fi

# Test HTTP access
print_status "Testing HTTP access..."
if curl -s --max-time 10 "http://$DOMAIN" > /dev/null; then
    print_success "✅ HTTP access works"
    HTTP_WORKS=true
else
    print_error "❌ HTTP access failed"
    HTTP_WORKS=false
fi

# Test HTTPS access
print_status "Testing HTTPS access..."
if curl -s --max-time 10 "https://$DOMAIN" > /dev/null; then
    print_success "✅ HTTPS access works"
    HTTPS_WORKS=true
else
    print_error "❌ HTTPS access failed"
    HTTPS_WORKS=false
fi

echo ""
print_status "=== DIAGNOSIS ==="

if [ "$HTTPS_WORKS" = true ]; then
    print_success "🎉 SSL is working correctly!"
    echo ""
    print_status "Your application is accessible at:"
    echo "  • HTTP:  http://$DOMAIN (redirects to HTTPS)"
    echo "  • HTTPS: https://$DOMAIN"
    
elif [ "$CERT_EXISTS" = false ]; then
    print_error "SSL certificate was not created"
    echo ""
    print_status "SOLUTION: Run SSL setup again"
    echo "  ./final-ssl-fix.sh"
    
elif [ "$NGINX_SSL" = false ]; then
    print_error "SSL certificates are not configured in nginx"
    echo ""
    print_status "SOLUTION: Copy certificates to nginx directory"
    echo "  sudo mkdir -p /etc/nginx/ssl"
    echo "  sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/server.crt"
    echo "  sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/server.key"
    echo "  sudo chown -R 1001:1001 /etc/nginx/ssl"
    echo "  sudo docker-compose -f docker-compose.prod.yml restart nginx"
    
elif [ "$NGINX_RUNNING" = false ]; then
    print_error "Nginx is not running"
    echo ""
    print_status "SOLUTION: Start nginx"
    echo "  sudo docker-compose -f docker-compose.prod.yml up -d nginx"
    
else
    print_warning "SSL setup appears incomplete"
    echo ""
    print_status "SOLUTION: Complete SSL setup"
    echo "  ./final-ssl-fix.sh"
fi

echo ""
print_status "=== QUICK FIXES ==="

if [ "$HTTP_WORKS" = true ] && [ "$HTTPS_WORKS" = false ]; then
    print_status "Your application is working on HTTP but not HTTPS"
    echo ""
    print_status "Quick access options:"
    echo "  • HTTP:  http://$DOMAIN"
    echo "  • Direct IP: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '18.116.241.244')"
    echo ""
    print_status "To enable HTTPS, run:"
    echo "  ./final-ssl-fix.sh"
fi

echo ""
print_status "=== SERVICE STATUS ==="
sudo docker-compose -f docker-compose.prod.yml ps
