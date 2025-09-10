#!/bin/bash

# Connection Diagnosis Script for CollabBoard
# This script diagnoses connection issues

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

echo "🔍 CollabBoard Connection Diagnosis"
echo "==================================="

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

# Get EC2 public IP
if [ -f /tmp/ec2_public_ip ]; then
    EC2_PUBLIC_IP=$(cat /tmp/ec2_public_ip)
else
    EC2_PUBLIC_IP="18.116.241.244"
fi

print_status "EC2 Public IP: $EC2_PUBLIC_IP"

echo ""
print_status "=== DNS RESOLUTION CHECK ==="

# Check DNS resolution
DOMAIN_IP=$(dig +short $DOMAIN | head -n1)
print_status "Domain $DOMAIN resolves to: $DOMAIN_IP"

if [ "$DOMAIN_IP" = "$EC2_PUBLIC_IP" ]; then
    print_success "✅ DNS is correctly pointing to your EC2 instance"
else
    print_error "❌ DNS is pointing to $DOMAIN_IP, but your EC2 IP is $EC2_PUBLIC_IP"
fi

echo ""
print_status "=== SERVICE STATUS CHECK ==="

# Check if services are running
print_status "Checking service status..."
sudo docker-compose -f docker-compose.prod.yml ps

echo ""
print_status "=== PORT CONNECTIVITY CHECK ==="

# Check if ports are listening
print_status "Checking if ports are listening..."

# Check port 80
if netstat -tlnp | grep -q ":80 "; then
    print_success "✅ Port 80 is listening"
else
    print_error "❌ Port 80 is not listening"
fi

# Check port 443
if netstat -tlnp | grep -q ":443 "; then
    print_success "✅ Port 443 is listening"
else
    print_error "❌ Port 443 is not listening"
fi

echo ""
print_status "=== LOCAL CONNECTIVITY TEST ==="

# Test localhost connectivity
print_status "Testing localhost connectivity..."

# Test HTTP on localhost
if curl -s --max-time 5 "http://localhost" > /dev/null; then
    print_success "✅ HTTP localhost works"
else
    print_error "❌ HTTP localhost failed"
fi

# Test HTTPS on localhost
if curl -s --max-time 5 "https://localhost" > /dev/null; then
    print_success "✅ HTTPS localhost works"
else
    print_error "❌ HTTPS localhost failed"
fi

echo ""
print_status "=== EXTERNAL CONNECTIVITY TEST ==="

# Test EC2 IP connectivity
print_status "Testing EC2 IP connectivity..."

# Test HTTP on EC2 IP
if curl -s --max-time 10 "http://$EC2_PUBLIC_IP" > /dev/null; then
    print_success "✅ HTTP EC2 IP works"
else
    print_error "❌ HTTP EC2 IP failed"
fi

# Test HTTPS on EC2 IP
if curl -s --max-time 10 "https://$EC2_PUBLIC_IP" > /dev/null; then
    print_success "✅ HTTPS EC2 IP works"
else
    print_error "❌ HTTPS EC2 IP failed"
fi

echo ""
print_status "=== DOMAIN CONNECTIVITY TEST ==="

# Test domain connectivity
print_status "Testing domain connectivity..."

# Test HTTP on domain
if curl -s --max-time 10 "http://$DOMAIN" > /dev/null; then
    print_success "✅ HTTP domain works"
else
    print_error "❌ HTTP domain failed"
fi

# Test HTTPS on domain
if curl -s --max-time 10 "https://$DOMAIN" > /dev/null; then
    print_success "✅ HTTPS domain works"
else
    print_error "❌ HTTPS domain failed"
fi

echo ""
print_status "=== SSL CERTIFICATE CHECK ==="

# Check if SSL certificate exists
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_success "✅ SSL certificate exists"
    
    # Check certificate details
    print_status "SSL certificate details:"
    sudo openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -text -noout | grep -E "(Subject:|Not Before|Not After|DNS:)"
else
    print_error "❌ SSL certificate does not exist"
fi

echo ""
print_status "=== NGINX CONFIGURATION CHECK ==="

# Check nginx configuration
print_status "Checking nginx configuration..."
if sudo docker-compose -f docker-compose.prod.yml exec nginx nginx -t 2>/dev/null; then
    print_success "✅ Nginx configuration is valid"
else
    print_error "❌ Nginx configuration has errors"
    print_status "Nginx configuration test output:"
    sudo docker-compose -f docker-compose.prod.yml exec nginx nginx -t
fi

echo ""
print_status "=== RECOMMENDATIONS ==="

# Provide recommendations based on findings
if [ "$DOMAIN_IP" != "$EC2_PUBLIC_IP" ]; then
    print_warning "1. Fix DNS: Update your domain's A record to point to $EC2_PUBLIC_IP"
fi

if ! netstat -tlnp | grep -q ":443 "; then
    print_warning "2. Port 443 is not listening - nginx might not be running or configured for HTTPS"
fi

if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_warning "3. SSL certificate is missing - run SSL setup"
fi

if ! curl -s --max-time 5 "http://localhost" > /dev/null; then
    print_warning "4. Application is not accessible locally - check service logs"
fi

echo ""
print_status "=== QUICK FIXES ==="

print_status "If services are not running:"
echo "  sudo docker-compose -f docker-compose.prod.yml up -d"

print_status "If SSL is missing:"
echo "  ./fix-unhealthy-services.sh"

print_status "If nginx has issues:"
echo "  sudo docker-compose -f docker-compose.prod.yml restart nginx"

print_status "Check service logs:"
echo "  sudo docker-compose -f docker-compose.prod.yml logs"
