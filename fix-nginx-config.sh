#!/bin/bash

# Fix Nginx Configuration Script for CollabBoard
# This script ensures nginx uses the correct configuration

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

echo "🔧 CollabBoard Nginx Configuration Fixer"
echo "========================================"

print_status "Fixing nginx configuration..."

# Stop nginx
print_status "Stopping nginx container..."
sudo docker-compose -f docker-compose.prod.yml stop nginx

# Remove the SSL generation script from nginx container
print_status "Updating nginx Dockerfile to remove SSL generation..."
cat > nginx/Dockerfile << 'EOF'
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.prod.conf /etc/nginx/nginx.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Create non-root user for security
RUN getent group nginx || addgroup -g 1001 -S nginx && \
    getent passwd nginx || adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
EOF

# Create a temporary nginx config without SSL for testing
print_status "Creating temporary nginx config for testing..."
cat > nginx/nginx.test.conf << 'EOF'
events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 16M;
    
    # Upstream servers
    upstream frontend {
        server frontend:3000;
    }
    
    upstream backend {
        server backend:3001;
    }
    
    # HTTP server (no HTTPS redirect for testing)
    server {
        listen 80;
        server_name _;
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # Let's Encrypt challenge - must be accessible via HTTP
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
            try_files $uri =404;
            access_log off;
        }
        
        # API routes - proxy to backend
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Socket.IO connections
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        
        # Static files and frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
EOF

# Update docker-compose to use test config
print_status "Updating docker-compose to use test configuration..."
sed -i 's|./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro|./nginx/nginx.test.conf:/etc/nginx/nginx.conf:ro|g' docker-compose.prod.yml

# Rebuild and start nginx
print_status "Rebuilding and starting nginx with test configuration..."
sudo docker-compose -f docker-compose.prod.yml up --build -d nginx

# Wait for nginx to start
print_status "Waiting for nginx to start..."
sleep 10

# Test the challenge path
print_status "Testing challenge path..."
TEST_URL="http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/.well-known/acme-challenge/test-challenge"

if curl -s "$TEST_URL" | grep -q "test-challenge-content"; then
    print_success "✅ Challenge path is now working!"
    
    # Clean up test file
    sudo rm -f /var/www/certbot/test-challenge
    
    echo ""
    print_success "🎉 Nginx configuration is fixed!"
    echo ""
    print_status "You can now run SSL setup:"
    echo "  ./setup-ssl-webroot.sh"
    
else
    print_error "❌ Challenge path is still not working"
    print_status "Checking nginx logs..."
    sudo docker-compose -f docker-compose.prod.yml logs nginx | tail -10
fi
