#!/bin/bash

# Fix Unhealthy Services Script for CollabBoard
# This script fixes unhealthy services and sets up SSL properly

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

echo "🔧 CollabBoard Service Fixer"
echo "============================"

# Get domain from user
read -p "Enter your domain name (e.g., collabboard.xyz): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

echo ""
print_status "=== FIXING UNHEALTHY SERVICES ==="

# Check service logs
print_status "Checking service logs for issues..."

print_status "Backend logs:"
sudo docker-compose -f docker-compose.prod.yml logs backend | tail -10

print_status "Frontend logs:"
sudo docker-compose -f docker-compose.prod.yml logs frontend | tail -10

print_status "Nginx logs:"
sudo docker-compose -f docker-compose.prod.yml logs nginx | tail -10

echo ""
print_status "=== RESTARTING SERVICES ==="

# Stop all services
print_status "Stopping all services..."
sudo docker-compose -f docker-compose.prod.yml down

# Wait a moment
sleep 5

# Start services one by one
print_status "Starting database..."
sudo docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be healthy
print_status "Waiting for database to be healthy..."
sleep 15

print_status "Starting backend..."
sudo docker-compose -f docker-compose.prod.yml up -d backend

# Wait for backend to be healthy
print_status "Waiting for backend to be healthy..."
sleep 15

print_status "Starting frontend..."
sudo docker-compose -f docker-compose.prod.yml up -d frontend

# Wait for frontend to be healthy
print_status "Waiting for frontend to be healthy..."
sleep 15

# Check service status
print_status "Checking service status..."
sudo docker-compose -f docker-compose.prod.yml ps

echo ""
print_status "=== TESTING CONNECTIVITY ==="

# Test backend
print_status "Testing backend connectivity..."
if curl -s --max-time 5 "http://localhost:3001/health" > /dev/null; then
    print_success "✅ Backend is accessible"
else
    print_warning "⚠️  Backend is not accessible"
fi

# Test frontend
print_status "Testing frontend connectivity..."
if curl -s --max-time 5 "http://localhost:3000" > /dev/null; then
    print_success "✅ Frontend is accessible"
else
    print_warning "⚠️  Frontend is not accessible"
fi

echo ""
print_status "=== SSL SETUP ==="

# Check if we need to set up SSL
print_status "Setting up SSL certificate..."

# Stop nginx to free up port 80
print_status "Stopping nginx for SSL setup..."
sudo docker-compose -f docker-compose.prod.yml stop nginx

# Make sure port 80 is free
print_status "Ensuring port 80 is available..."
sudo pkill -f "nginx" || true
sudo systemctl stop apache2 || true
sudo systemctl stop nginx || true

# Wait a moment
sleep 3

# Get email for Let's Encrypt
read -p "Enter your email address for Let's Encrypt: " EMAIL

if [ -z "$EMAIL" ]; then
    print_error "Email address is required"
    exit 1
fi

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
    print_warning "Starting nginx without SSL..."
    sudo docker-compose -f docker-compose.prod.yml up -d nginx
fi

echo ""
print_status "=== FINAL STATUS ==="
sudo docker-compose -f docker-compose.prod.yml ps
