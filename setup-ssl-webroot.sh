#!/bin/bash

# Webroot SSL Setup Script for CollabBoard
# This script uses webroot method which doesn't require stopping nginx

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

echo "🔒 CollabBoard Webroot SSL Setup"
echo "================================"

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

# Get email for Let's Encrypt
read -p "Enter your email address for Let's Encrypt: " EMAIL

if [ -z "$EMAIL" ]; then
    print_error "Email address is required"
    exit 1
fi

print_status "Setting up SSL certificate for $DOMAIN using webroot method..."

# Create webroot directory
print_status "Creating webroot directory for Let's Encrypt challenges..."
sudo mkdir -p /var/www/certbot

# Make sure nginx is running
print_status "Ensuring nginx is running..."
sudo docker-compose -f docker-compose.prod.yml up -d nginx

# Wait for nginx to be ready
print_status "Waiting for nginx to be ready..."
sleep 10

# Test if domain is accessible
print_status "Testing if domain is accessible..."
if ! curl -s --max-time 10 "http://$DOMAIN" > /dev/null; then
    print_error "Domain $DOMAIN is not accessible"
    print_warning "Please check:"
    echo "1. DNS A record points to: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
    echo "2. Security group allows HTTP (port 80)"
    echo "3. DNS has propagated (check at: https://www.whatsmydns.net/#A/$DOMAIN)"
    exit 1
fi

print_success "Domain is accessible, proceeding with SSL setup..."

# Get SSL certificate using webroot method
print_status "Requesting SSL certificate from Let's Encrypt using webroot method..."
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
    print_warning "Common issues and solutions:"
    echo "1. Domain not accessible:"
    echo "   - Check DNS A record points to: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
    echo "   - Wait for DNS propagation"
    echo "   - Check security group allows HTTP (port 80)"
    echo ""
    echo "2. Nginx not serving challenges:"
    echo "   - Check nginx is running: docker-compose ps"
    echo "   - Check nginx logs: docker-compose logs nginx"
    echo ""
    echo "3. Permission issues:"
    echo "   - Make sure /var/www/certbot is writable"
    echo ""
    echo "Run this script again once issues are resolved."
fi
