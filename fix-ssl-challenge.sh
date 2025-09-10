#!/bin/bash

# Fix SSL Challenge Script for CollabBoard
# This script fixes the Let's Encrypt challenge issue

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

echo "🔧 CollabBoard SSL Challenge Fixer"
echo "=================================="

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

print_status "Fixing SSL challenge for $DOMAIN..."

# Create webroot directory
print_status "Creating webroot directory..."
sudo mkdir -p /var/www/certbot

# Create a test file to verify webroot is working
print_status "Creating test challenge file..."
TEST_FILE="/var/www/certbot/test-challenge"
echo "test-challenge-content" | sudo tee "$TEST_FILE" > /dev/null

# Restart nginx to pick up configuration changes
print_status "Restarting nginx with updated configuration..."
sudo docker-compose -f docker-compose.prod.yml restart nginx

# Wait for nginx to restart
print_status "Waiting for nginx to restart..."
sleep 10

# Test if the challenge path is accessible
print_status "Testing challenge path accessibility..."
TEST_URL="http://$DOMAIN/.well-known/acme-challenge/test-challenge"

if curl -s "$TEST_URL" | grep -q "test-challenge-content"; then
    print_success "✅ Challenge path is working correctly!"
    
    # Clean up test file
    sudo rm -f "$TEST_FILE"
    
    # Now try SSL certificate again
    print_status "Attempting SSL certificate setup..."
    
    # Get email for Let's Encrypt
    read -p "Enter your email address for Let's Encrypt: " EMAIL
    
    if [ -z "$EMAIL" ]; then
        print_error "Email address is required"
        exit 1
    fi
    
    # Get SSL certificate using webroot method
    sudo certbot certonly \
        --webroot \
        -w /var/www/certbot \
        -d $DOMAIN \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        --force-renewal
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificate obtained successfully!"
        
        # Create nginx SSL directory
        print_status "Setting up SSL certificates for nginx..."
        sudo mkdir -p /etc/nginx/ssl
        
        # Copy certificates to nginx directory
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/server.crt
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/server.key
        
        # Update nginx configuration with domain
        print_status "Updating nginx configuration..."
        sudo sed -i "s/server_name _;/server_name $DOMAIN;/g" nginx/nginx.prod.conf
        
        # Set proper permissions
        sudo chown -R 1001:1001 /etc/nginx/ssl
        
        print_success "SSL certificates configured for $DOMAIN"
        
        # Restart nginx to load SSL configuration
        print_status "Restarting nginx with SSL configuration..."
        sudo docker-compose -f docker-compose.prod.yml restart nginx
        
        # Wait for nginx to restart
        sleep 5
        
        # Setup auto-renewal with webroot method
        print_status "Setting up SSL certificate auto-renewal..."
        sudo tee /etc/cron.d/certbot-renewal > /dev/null <<EOF
# Renew SSL certificates twice daily using webroot method
0 12 * * * root certbot renew --quiet --webroot -w /var/www/certbot --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
0 0 * * * root certbot renew --quiet --webroot -w /var/www/certbot --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
EOF
        
        print_success "SSL certificate auto-renewal configured"
        
        # Test SSL
        print_status "Testing SSL configuration..."
        if curl -s --max-time 10 "https://$DOMAIN" > /dev/null; then
            print_success "✅ SSL is working correctly!"
        else
            print_warning "⚠️  SSL test failed, but certificate was obtained"
        fi
        
        echo ""
        print_success "🎉 SSL setup completed successfully!"
        echo ""
        echo "Your application should now be accessible at:"
        echo "  • HTTP:  http://$DOMAIN (redirects to HTTPS)"
        echo "  • HTTPS: https://$DOMAIN"
        echo ""
        echo "Test your setup:"
        echo "  curl -I https://$DOMAIN"
        
    else
        print_error "SSL certificate setup failed"
        echo ""
        print_warning "The challenge path is working, but SSL setup still failed."
        print_warning "This might be due to:"
        echo "1. Rate limiting from Let's Encrypt (try again in an hour)"
        echo "2. Domain validation issues"
        echo "3. Network connectivity problems"
    fi
    
else
    print_error "❌ Challenge path is not working"
    print_warning "The issue is that nginx cannot serve files from /var/www/certbot"
    echo ""
    print_status "Debugging information:"
    echo "Test URL: $TEST_URL"
    echo "Response: $(curl -s "$TEST_URL" || echo "Failed to connect")"
    echo ""
    print_warning "Possible solutions:"
    echo "1. Check if the webroot volume is mounted correctly in docker-compose.yml"
    echo "2. Check nginx configuration for the challenge path"
    echo "3. Check file permissions on /var/www/certbot"
    echo ""
    print_status "Checking docker-compose volume mount..."
    sudo docker-compose -f docker-compose.prod.yml config | grep -A 5 -B 5 certbot || echo "No certbot volume found"
fi
