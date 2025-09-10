#!/bin/bash

# Final SSL Fix Script for CollabBoard
# This script addresses all SSL setup issues

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

echo "🔒 CollabBoard Final SSL Fix"
echo "============================"

# Get EC2 public IP
if [ -f /tmp/ec2_public_ip ]; then
    EC2_PUBLIC_IP=$(cat /tmp/ec2_public_ip)
else
    EC2_PUBLIC_IP="18.116.241.244"
fi

print_status "EC2 Public IP: $EC2_PUBLIC_IP"

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

echo ""
print_status "=== COMPREHENSIVE DNS CHECK ==="

# Check DNS from multiple sources
print_status "Checking DNS resolution from multiple sources..."

# Local DNS
LOCAL_DNS=$(dig +short $DOMAIN | head -n1)
print_status "Local DNS: $LOCAL_DNS"

# Google DNS
GOOGLE_DNS=$(dig @8.8.8.8 +short $DOMAIN | head -n1)
print_status "Google DNS: $GOOGLE_DNS"

# Cloudflare DNS
CLOUDFLARE_DNS=$(dig @1.1.1.1 +short $DOMAIN | head -n1)
print_status "Cloudflare DNS: $CLOUDFLARE_DNS"

# Check if any DNS returns the correct IP
if [ "$LOCAL_DNS" = "$EC2_PUBLIC_IP" ] || [ "$GOOGLE_DNS" = "$EC2_PUBLIC_IP" ] || [ "$CLOUDFLARE_DNS" = "$EC2_PUBLIC_IP" ]; then
    print_success "✅ At least one DNS server returns the correct IP"
    DNS_OK=true
else
    print_error "❌ No DNS server returns the correct IP ($EC2_PUBLIC_IP)"
    print_warning "DNS propagation is not complete yet"
    DNS_OK=false
fi

echo ""
print_status "=== APPLICATION STATUS CHECK ==="

# Check if application is running
print_status "Checking application status..."
if sudo docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_success "✅ Application is running"
else
    print_warning "⚠️  Application is not running, starting it..."
    sudo docker-compose -f docker-compose.prod.yml up -d
    sleep 30
fi

# Test local connectivity
print_status "Testing local connectivity..."
if curl -s --max-time 5 "http://localhost" > /dev/null; then
    print_success "✅ Application is accessible locally"
else
    print_error "❌ Application is not accessible locally"
    print_status "Checking service logs..."
    sudo docker-compose -f docker-compose.prod.yml logs --tail=20
fi

echo ""
print_status "=== SSL SETUP OPTIONS ==="

if [ "$DNS_OK" = true ]; then
    print_status "DNS appears to be working. Attempting SSL setup..."
    
    # Stop nginx to free up port 80
    print_status "Stopping nginx to free up port 80..."
    sudo docker-compose -f docker-compose.prod.yml stop nginx
    
    # Make sure port 80 is free
    print_status "Ensuring port 80 is available..."
    sudo pkill -f "nginx" || true
    sudo systemctl stop apache2 || true
    sudo systemctl stop nginx || true
    
    # Wait a moment
    sleep 3
    
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
        print_warning "This might be due to:"
        echo "1. DNS not fully propagated yet"
        echo "2. Security group blocking port 80"
        echo "3. Rate limiting from Let's Encrypt"
        echo ""
        print_status "Starting services without SSL..."
        sudo docker-compose -f docker-compose.prod.yml up -d
    fi
    
else
    print_warning "DNS is not ready yet. Here are your options:"
    echo ""
    print_status "Option 1: Wait for DNS propagation"
    echo "  - Check DNS status at: https://www.whatsmydns.net/#A/$DOMAIN"
    echo "  - Wait until most locations show: $EC2_PUBLIC_IP"
    echo "  - Then run this script again"
    echo ""
    print_status "Option 2: Use alternative ports (no SSL)"
    echo "  - Run: sudo docker-compose -f docker-compose.prod-alt.yml up -d"
    echo "  - Access via: http://$EC2_PUBLIC_IP:8080"
    echo ""
    print_status "Option 3: Test with direct IP"
    echo "  - Your app should be accessible at: http://$EC2_PUBLIC_IP"
    echo "  - (No SSL, but you can test the application)"
    echo ""
    print_status "Starting services without SSL for now..."
    sudo docker-compose -f docker-compose.prod.yml up -d
fi
