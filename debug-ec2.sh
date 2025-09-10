#!/bin/bash

# Debug EC2 Metadata Script
# This script helps debug EC2 metadata access issues

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

echo "🔍 EC2 Metadata Debug"
echo "===================="

# Test basic connectivity
print_status "Testing basic connectivity..."
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    print_success "✅ Internet connectivity is working"
else
    print_error "❌ No internet connectivity"
    exit 1
fi

# Test metadata service connectivity
print_status "Testing metadata service connectivity..."
if curl -s --max-time 5 http://169.254.169.254/ > /dev/null; then
    print_success "✅ Metadata service is accessible"
else
    print_error "❌ Cannot access metadata service"
    print_warning "This might be a network configuration issue"
fi

# Try different ways to get the public IP
print_status "Trying different methods to get public IP..."

# Method 1: Standard metadata
print_status "Method 1: Standard metadata..."
PUBLIC_IP1=$(curl -s --max-time 10 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "FAILED")
if [ "$PUBLIC_IP1" != "FAILED" ] && [ -n "$PUBLIC_IP1" ]; then
    print_success "✅ Method 1 worked: $PUBLIC_IP1"
else
    print_error "❌ Method 1 failed: $PUBLIC_IP1"
fi

# Method 2: Alternative metadata endpoint
print_status "Method 2: Alternative metadata endpoint..."
PUBLIC_IP2=$(curl -s --max-time 10 http://169.254.169.254/latest/meta-data/public-ipv4/ 2>/dev/null || echo "FAILED")
if [ "$PUBLIC_IP2" != "FAILED" ] && [ -n "$PUBLIC_IP2" ]; then
    print_success "✅ Method 2 worked: $PUBLIC_IP2"
else
    print_error "❌ Method 2 failed: $PUBLIC_IP2"
fi

# Method 3: External service
print_status "Method 3: External service..."
PUBLIC_IP3=$(curl -s --max-time 10 https://ipv4.icanhazip.com 2>/dev/null || echo "FAILED")
if [ "$PUBLIC_IP3" != "FAILED" ] && [ -n "$PUBLIC_IP3" ]; then
    print_success "✅ Method 3 worked: $PUBLIC_IP3"
else
    print_error "❌ Method 3 failed: $PUBLIC_IP3"
fi

# Method 4: Another external service
print_status "Method 4: Another external service..."
PUBLIC_IP4=$(curl -s --max-time 10 https://api.ipify.org 2>/dev/null || echo "FAILED")
if [ "$PUBLIC_IP4" != "FAILED" ] && [ -n "$PUBLIC_IP4" ]; then
    print_success "✅ Method 4 worked: $PUBLIC_IP4"
else
    print_error "❌ Method 4 failed: $PUBLIC_IP4"
fi

# Method 5: Check if we have an Elastic IP
print_status "Method 5: Checking for Elastic IP..."
EIP=$(curl -s --max-time 10 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "FAILED")
if [ "$EIP" != "FAILED" ] && [ -n "$EIP" ]; then
    print_success "✅ Elastic IP found: $EIP"
else
    print_warning "⚠️  No Elastic IP found"
fi

# Get instance ID
print_status "Getting instance ID..."
INSTANCE_ID=$(curl -s --max-time 10 http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "FAILED")
if [ "$INSTANCE_ID" != "FAILED" ] && [ -n "$INSTANCE_ID" ]; then
    print_success "✅ Instance ID: $INSTANCE_ID"
else
    print_error "❌ Cannot get instance ID"
fi

# Get availability zone
print_status "Getting availability zone..."
AZ=$(curl -s --max-time 10 http://169.254.169.254/latest/meta-data/placement/availability-zone 2>/dev/null || echo "FAILED")
if [ "$AZ" != "FAILED" ] && [ -n "$AZ" ]; then
    print_success "✅ Availability Zone: $AZ"
else
    print_error "❌ Cannot get availability zone"
fi

echo ""
print_status "=== SUMMARY ==="

# Determine which IP to use
if [ "$PUBLIC_IP1" != "FAILED" ] && [ -n "$PUBLIC_IP1" ]; then
    FINAL_IP="$PUBLIC_IP1"
    print_success "Using EC2 metadata IP: $FINAL_IP"
elif [ "$PUBLIC_IP3" != "FAILED" ] && [ -n "$PUBLIC_IP3" ]; then
    FINAL_IP="$PUBLIC_IP3"
    print_success "Using external service IP: $FINAL_IP"
elif [ "$PUBLIC_IP4" != "FAILED" ] && [ -n "$PUBLIC_IP4" ]; then
    FINAL_IP="$PUBLIC_IP4"
    print_success "Using external service IP: $FINAL_IP"
else
    print_error "❌ Cannot determine public IP"
    exit 1
fi

echo ""
print_status "=== NEXT STEPS ==="
print_status "Your public IP appears to be: $FINAL_IP"
print_status "Update your DNS A record to point to this IP"
print_status "Then run: ./quick-fix.sh"

# Save the IP to a file for other scripts to use
echo "$FINAL_IP" > /tmp/ec2_public_ip
print_status "IP saved to /tmp/ec2_public_ip"
