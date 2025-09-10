#!/bin/bash

# DNS Propagation Check Script
# This script checks DNS propagation status

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

echo "🌐 DNS Propagation Checker"
echo "=========================="

# Get the public IP from the debug script
if [ -f /tmp/ec2_public_ip ]; then
    EC2_PUBLIC_IP=$(cat /tmp/ec2_public_ip)
    print_success "EC2 Public IP: $EC2_PUBLIC_IP"
else
    EC2_PUBLIC_IP="18.116.241.244"
    print_status "Using known EC2 Public IP: $EC2_PUBLIC_IP"
fi

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

echo ""
print_status "=== DNS PROPAGATION CHECK ==="

# Check DNS resolution from multiple sources
print_status "Checking DNS resolution from different sources..."

# Local DNS
print_status "1. Local DNS resolution..."
LOCAL_DNS=$(dig +short $DOMAIN | head -n1)
print_status "   Result: $LOCAL_DNS"

# Google DNS
print_status "2. Google DNS (8.8.8.8)..."
GOOGLE_DNS=$(dig @8.8.8.8 +short $DOMAIN | head -n1)
print_status "   Result: $GOOGLE_DNS"

# Cloudflare DNS
print_status "3. Cloudflare DNS (1.1.1.1)..."
CLOUDFLARE_DNS=$(dig @1.1.1.1 +short $DOMAIN | head -n1)
print_status "   Result: $CLOUDFLARE_DNS"

# OpenDNS
print_status "4. OpenDNS (208.67.222.222)..."
OPENDNS=$(dig @208.67.222.222 +short $DOMAIN | head -n1)
print_status "   Result: $OPENDNS"

echo ""
print_status "=== PROPAGATION STATUS ==="

# Count how many DNS servers return the correct IP
CORRECT_COUNT=0
TOTAL_COUNT=4

if [ "$LOCAL_DNS" = "$EC2_PUBLIC_IP" ]; then
    print_success "✅ Local DNS: Correct ($LOCAL_DNS)"
    ((CORRECT_COUNT++))
else
    print_warning "⚠️  Local DNS: $LOCAL_DNS (expected: $EC2_PUBLIC_IP)"
fi

if [ "$GOOGLE_DNS" = "$EC2_PUBLIC_IP" ]; then
    print_success "✅ Google DNS: Correct ($GOOGLE_DNS)"
    ((CORRECT_COUNT++))
else
    print_warning "⚠️  Google DNS: $GOOGLE_DNS (expected: $EC2_PUBLIC_IP)"
fi

if [ "$CLOUDFLARE_DNS" = "$EC2_PUBLIC_IP" ]; then
    print_success "✅ Cloudflare DNS: Correct ($CLOUDFLARE_DNS)"
    ((CORRECT_COUNT++))
else
    print_warning "⚠️  Cloudflare DNS: $CLOUDFLARE_DNS (expected: $EC2_PUBLIC_IP)"
fi

if [ "$OPENDNS" = "$EC2_PUBLIC_IP" ]; then
    print_success "✅ OpenDNS: Correct ($OPENDNS)"
    ((CORRECT_COUNT++))
else
    print_warning "⚠️  OpenDNS: $OPENDNS (expected: $EC2_PUBLIC_IP)"
fi

echo ""
print_status "=== SUMMARY ==="
print_status "Correct DNS responses: $CORRECT_COUNT out of $TOTAL_COUNT"

if [ $CORRECT_COUNT -eq $TOTAL_COUNT ]; then
    print_success "🎉 DNS is fully propagated!"
    echo ""
    print_status "You can now proceed with SSL setup:"
    echo "  ./simple-ssl-setup.sh"
elif [ $CORRECT_COUNT -gt 0 ]; then
    print_warning "🔄 DNS is partially propagated ($CORRECT_COUNT/$TOTAL_COUNT)"
    echo ""
    print_status "This is normal - DNS propagation can take time."
    print_status "You can try SSL setup now, or wait for full propagation."
    echo ""
    print_status "Try SSL setup:"
    echo "  ./simple-ssl-setup.sh"
else
    print_error "❌ DNS is not propagated yet"
    echo ""
    print_warning "Your DNS A record might not be set correctly."
    print_warning "Make sure your A record points to: $EC2_PUBLIC_IP"
    echo ""
    print_status "Check your DNS settings at your domain registrar."
fi

echo ""
print_status "=== TESTING CONNECTIVITY ==="

# Test if we can reach the domain
print_status "Testing HTTP connectivity to $DOMAIN..."
if curl -s --max-time 10 "http://$DOMAIN" > /dev/null; then
    print_success "✅ HTTP connection to $DOMAIN works!"
else
    print_warning "⚠️  HTTP connection to $DOMAIN failed"
    print_status "This might be due to:"
    echo "1. DNS not fully propagated"
    echo "2. Application not running"
    echo "3. Security group blocking port 80"
fi

# Test if we can reach the EC2 IP directly
print_status "Testing HTTP connectivity to EC2 IP..."
if curl -s --max-time 10 "http://$EC2_PUBLIC_IP" > /dev/null; then
    print_success "✅ HTTP connection to EC2 IP works!"
else
    print_warning "⚠️  HTTP connection to EC2 IP failed"
    print_warning "This suggests the application is not running or port 80 is blocked"
fi
