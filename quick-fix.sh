#!/bin/bash

# Quick Fix Script for CollabBoard
# This script fixes the common issues found

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

echo "🔧 CollabBoard Quick Fix"
echo "======================="

# Get EC2 public IP
print_status "Getting EC2 public IP..."
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
if [ -z "$EC2_PUBLIC_IP" ]; then
    print_error "Cannot get EC2 public IP. Are you running this on EC2?"
    exit 1
fi
print_success "EC2 Public IP: $EC2_PUBLIC_IP"

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

echo ""
print_status "=== FIXING ISSUES ==="

# Check DNS
print_status "Checking DNS resolution..."
DOMAIN_IP=$(dig +short $DOMAIN | head -n1)
print_status "Domain $DOMAIN resolves to: $DOMAIN_IP"

if [ "$DOMAIN_IP" != "$EC2_PUBLIC_IP" ]; then
    print_error "❌ DNS is pointing to $DOMAIN_IP, but your EC2 IP is $EC2_PUBLIC_IP"
    echo ""
    print_warning "You need to update your DNS A record:"
    echo "1. Go to your domain registrar (where you bought $DOMAIN)"
    echo "2. Find DNS management settings"
    echo "3. Update the A record:"
    echo "   - Name: @ (or leave blank)"
    echo "   - Value: $EC2_PUBLIC_IP"
    echo "   - TTL: 300"
    echo ""
    print_warning "Wait for DNS propagation (5 minutes to 48 hours)"
    print_status "Check propagation at: https://www.whatsmydns.net/#A/$DOMAIN"
    echo ""
    read -p "Press Enter after updating DNS and waiting for propagation..."
else
    print_success "✅ DNS is correctly pointing to your EC2 instance"
fi

# Start the application
print_status "Starting CollabBoard application..."
sudo docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 30

# Test if port 80 is now accessible
print_status "Testing port 80 accessibility..."
if curl -s --max-time 5 "http://localhost" > /dev/null; then
    print_success "✅ Port 80 is now accessible from localhost"
else
    print_warning "⚠️  Port 80 is still not accessible from localhost"
    print_status "Checking service status..."
    sudo docker-compose -f docker-compose.prod.yml ps
fi

# Test from public IP
print_status "Testing from public IP..."
if curl -s --max-time 10 "http://$EC2_PUBLIC_IP" > /dev/null; then
    print_success "✅ Port 80 is accessible from public IP"
else
    print_error "❌ Port 80 is not accessible from public IP"
    print_warning "This suggests a security group issue"
fi

# Test from domain
print_status "Testing from domain..."
if curl -s --max-time 10 "http://$DOMAIN" > /dev/null; then
    print_success "✅ Port 80 is accessible from domain"
else
    print_error "❌ Port 80 is not accessible from domain"
fi

echo ""
print_status "=== NEXT STEPS ==="

if curl -s --max-time 10 "http://$DOMAIN" > /dev/null; then
    print_success "🎉 Your application is accessible!"
    echo ""
    print_status "You can now try SSL setup:"
    echo "  ./simple-ssl-setup.sh"
    echo ""
    print_status "Or access your application at:"
    echo "  http://$DOMAIN"
else
    print_warning "Your application is not yet accessible. Check:"
    echo "1. DNS A record points to: $EC2_PUBLIC_IP"
    echo "2. Security group allows HTTP (port 80) from 0.0.0.0/0"
    echo "3. Wait for DNS propagation"
    echo ""
    print_status "Test from your local machine:"
    echo "  curl -I http://$EC2_PUBLIC_IP"
fi
