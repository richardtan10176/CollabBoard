#!/bin/bash

# DNS Check Script for CollabBoard
# This script helps verify your domain DNS configuration

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

echo "🌐 CollabBoard DNS Configuration Checker"
echo "========================================"

# Get EC2 public IP
print_status "Getting EC2 public IP address..."
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
print_success "EC2 Public IP: $EC2_PUBLIC_IP"

echo ""

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

print_status "Checking DNS configuration for $DOMAIN..."

# Check A record
print_status "Checking A record for $DOMAIN..."
DOMAIN_IP=$(dig +short $DOMAIN | head -n1)

if [ -z "$DOMAIN_IP" ]; then
    print_error "No A record found for $DOMAIN"
    print_warning "You need to create an A record pointing to: $EC2_PUBLIC_IP"
else
    print_success "A record found: $DOMAIN -> $DOMAIN_IP"
    
    if [ "$DOMAIN_IP" = "$EC2_PUBLIC_IP" ]; then
        print_success "✅ DNS is correctly pointing to your EC2 instance!"
    else
        print_error "❌ DNS is pointing to $DOMAIN_IP, but your EC2 IP is $EC2_PUBLIC_IP"
        print_warning "You need to update your A record to point to: $EC2_PUBLIC_IP"
    fi
fi

echo ""

# Check if domain is accessible
print_status "Testing if domain is accessible..."
if curl -s --max-time 10 "http://$DOMAIN" > /dev/null; then
    print_success "✅ Domain is accessible via HTTP"
else
    print_warning "⚠️  Domain is not accessible via HTTP"
    print_status "This might be normal if DNS is still propagating"
fi

echo ""

# Check DNS propagation
print_status "Checking DNS propagation status..."
print_status "You can also check propagation at: https://www.whatsmydns.net/#A/$DOMAIN"

echo ""

# Provide next steps
print_status "Next Steps:"
echo "1. If DNS is not pointing to your EC2 IP ($EC2_PUBLIC_IP):"
echo "   - Go to your domain registrar's DNS management"
echo "   - Create/update A record: $DOMAIN -> $EC2_PUBLIC_IP"
echo "   - Wait for DNS propagation (5 minutes to 48 hours)"
echo ""
echo "2. If DNS is correct but still not working:"
echo "   - Wait for DNS propagation"
echo "   - Check your security group allows HTTP (port 80) and HTTPS (port 443)"
echo ""
echo "3. Once DNS is working, run SSL setup again:"
echo "   ./deploy-aws.sh --ssl-only"
