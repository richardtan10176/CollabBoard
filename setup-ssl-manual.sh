#!/bin/bash

# Manual SSL Setup Script for CollabBoard
# This script helps set up SSL certificates when DNS is properly configured

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

echo "🔒 CollabBoard Manual SSL Setup"
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

# Stop nginx temporarily
print_status "Stopping nginx container..."
sudo docker-compose -f docker-compose.prod.yml stop nginx

# Make sure port 80 is free
print_status "Ensuring port 80 is available..."
sudo pkill -f "nginx" || true
sudo systemctl stop apache2 || true
sudo systemctl stop nginx || true

# Wait a moment
sleep 2

# Get SSL certificate
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
    
    # Restart nginx
    print_status "Starting nginx with SSL configuration..."
    sudo docker-compose -f docker-compose.prod.yml up -d nginx
    
    # Setup auto-renewal
    print_status "Setting up SSL certificate auto-renewal..."
    sudo tee /etc/cron.d/certbot-renewal > /dev/null <<EOF
# Renew SSL certificates twice daily
0 12 * * * root certbot renew --quiet --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
0 0 * * * root certbot renew --quiet --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
EOF
    
    print_success "SSL certificate auto-renewal configured"
    
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
    echo "1. DNS not pointing to this server:"
    echo "   - Check your domain's A record points to: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
    echo "   - Wait for DNS propagation (can take up to 48 hours)"
    echo ""
    echo "2. Port 80 not accessible:"
    echo "   - Check your security group allows HTTP (port 80)"
    echo "   - Make sure no other service is using port 80"
    echo ""
    echo "3. Domain not resolving:"
    echo "   - Check DNS propagation at: https://www.whatsmydns.net/#A/$DOMAIN"
    echo ""
    echo "Run this script again once DNS is properly configured."
    
    # Restart nginx without SSL for now
    print_status "Starting nginx without SSL..."
    sudo docker-compose -f docker-compose.prod.yml up -d nginx
fi
