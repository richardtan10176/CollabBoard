#!/bin/bash

# Simple SSL Setup Script for CollabBoard
# This script bypasses the nginx configuration issues

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

echo "🔒 CollabBoard Simple SSL Setup"
echo "==============================="

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

print_status "Setting up SSL certificate for $DOMAIN..."

# Stop all containers to free up ports
print_status "Stopping all containers..."
sudo docker-compose -f docker-compose.prod.yml down

# Make sure ports are free
print_status "Ensuring ports 80 and 443 are available..."
sudo pkill -f "nginx" || true
sudo systemctl stop apache2 || true
sudo systemctl stop nginx || true

# Wait a moment
sleep 3

# Start only the backend and frontend (no nginx)
print_status "Starting backend and frontend services..."
sudo docker-compose -f docker-compose.prod.yml up -d postgres backend frontend

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Get SSL certificate using standalone method
print_status "Requesting SSL certificate from Let's Encrypt..."
sudo certbot certonly \
    --standalone \
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
    
    # Start nginx with SSL
    print_status "Starting nginx with SSL configuration..."
    sudo docker-compose -f docker-compose.prod.yml up -d nginx
    
    # Wait for nginx to start
    sleep 10
    
    # Setup auto-renewal
    print_status "Setting up SSL certificate auto-renewal..."
    sudo tee /etc/cron.d/certbot-renewal > /dev/null <<EOF
# Renew SSL certificates twice daily
0 12 * * * root certbot renew --quiet --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
0 0 * * * root certbot renew --quiet --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
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
    print_warning "This might be due to:"
    echo "1. Domain not pointing to this server"
    echo "2. DNS not propagated yet"
    echo "3. Port 80 not accessible from internet"
    echo ""
    print_status "Starting services without SSL..."
    sudo docker-compose -f docker-compose.prod.yml up -d
fi
