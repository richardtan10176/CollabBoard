#!/bin/bash

# SSL Troubleshooting Script for CollabBoard
# This script helps diagnose SSL setup issues

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

echo "🔍 CollabBoard SSL Troubleshooting"
echo "================================="

# Get EC2 public IP
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
print_status "EC2 Public IP: $EC2_PUBLIC_IP"

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

echo ""
print_status "=== DNS CHECK ==="
# Check DNS resolution
DOMAIN_IP=$(dig +short $DOMAIN | head -n1)
print_status "Domain $DOMAIN resolves to: $DOMAIN_IP"

if [ "$DOMAIN_IP" = "$EC2_PUBLIC_IP" ]; then
    print_success "✅ DNS is correctly pointing to your EC2 instance"
else
    print_error "❌ DNS is pointing to $DOMAIN_IP, but your EC2 IP is $EC2_PUBLIC_IP"
    print_warning "You need to update your DNS A record to point to: $EC2_PUBLIC_IP"
fi

echo ""
print_status "=== PORT ACCESSIBILITY CHECK ==="
# Check if port 80 is accessible
print_status "Testing port 80 accessibility..."

# Test from localhost
if curl -s --max-time 5 "http://localhost" > /dev/null; then
    print_success "✅ Port 80 is accessible from localhost"
else
    print_warning "⚠️  Port 80 is not accessible from localhost"
fi

# Test from public IP
if curl -s --max-time 10 "http://$EC2_PUBLIC_IP" > /dev/null; then
    print_success "✅ Port 80 is accessible from public IP"
else
    print_error "❌ Port 80 is not accessible from public IP"
    print_warning "This suggests a security group or firewall issue"
fi

# Test from domain
if curl -s --max-time 10 "http://$DOMAIN" > /dev/null; then
    print_success "✅ Port 80 is accessible from domain"
else
    print_error "❌ Port 80 is not accessible from domain"
fi

echo ""
print_status "=== SECURITY GROUP CHECK ==="
# Check security group rules
print_status "Checking security group rules..."

# Get security group ID
SG_ID=$(aws ec2 describe-instances --instance-ids $(curl -s http://169.254.169.254/latest/meta-data/instance-id) --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "ERROR")

if [ "$SG_ID" = "ERROR" ]; then
    print_error "❌ Cannot access AWS CLI to check security group"
    print_warning "Make sure AWS CLI is configured with proper permissions"
else
    print_status "Security Group ID: $SG_ID"
    
    # Check HTTP rule
    HTTP_RULE=$(aws ec2 describe-security-groups --group-ids $SG_ID --query 'SecurityGroups[0].IpPermissions[?FromPort==`80`]' --output text 2>/dev/null || echo "")
    
    if [ -n "$HTTP_RULE" ]; then
        print_success "✅ HTTP rule (port 80) found in security group"
    else
        print_error "❌ HTTP rule (port 80) not found in security group"
        print_warning "You need to add an HTTP rule allowing port 80 from 0.0.0.0/0"
    fi
    
    # Check HTTPS rule
    HTTPS_RULE=$(aws ec2 describe-security-groups --group-ids $SG_ID --query 'SecurityGroups[0].IpPermissions[?FromPort==`443`]' --output text 2>/dev/null || echo "")
    
    if [ -n "$HTTPS_RULE" ]; then
        print_success "✅ HTTPS rule (port 443) found in security group"
    else
        print_warning "⚠️  HTTPS rule (port 443) not found in security group"
        print_warning "You should add an HTTPS rule allowing port 443 from 0.0.0.0/0"
    fi
fi

echo ""
print_status "=== NETWORK CONNECTIVITY CHECK ==="
# Check if we can reach Let's Encrypt
print_status "Testing connectivity to Let's Encrypt..."
if curl -s --max-time 10 "https://acme-v02.api.letsencrypt.org/directory" > /dev/null; then
    print_success "✅ Can reach Let's Encrypt API"
else
    print_error "❌ Cannot reach Let's Encrypt API"
    print_warning "This might be a network connectivity issue"
fi

echo ""
print_status "=== RECOMMENDATIONS ==="
if [ "$DOMAIN_IP" != "$EC2_PUBLIC_IP" ]; then
    print_warning "1. Fix DNS: Update your domain's A record to point to $EC2_PUBLIC_IP"
fi

if [ -z "$HTTP_RULE" ]; then
    print_warning "2. Add HTTP rule: Allow port 80 from 0.0.0.0/0 in your security group"
fi

if [ -z "$HTTPS_RULE" ]; then
    print_warning "3. Add HTTPS rule: Allow port 443 from 0.0.0.0/0 in your security group"
fi

print_status "4. Wait for changes to propagate (can take 2-5 minutes)"
print_status "5. Try SSL setup again: ./simple-ssl-setup.sh"

echo ""
print_status "=== QUICK FIX COMMANDS ==="
echo "Add HTTP rule:"
echo "aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0"
echo ""
echo "Add HTTPS rule:"
echo "aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0"
