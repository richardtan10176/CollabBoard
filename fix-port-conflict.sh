#!/bin/bash

# Fix Port Conflict Script for CollabBoard
# This script helps resolve port 80/443 conflicts

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

echo "🔧 CollabBoard Port Conflict Fixer"
echo "=================================="

# Check what's using port 80
print_status "Checking what's using port 80..."
PORT_80_PROCESS=$(sudo lsof -i :80 2>/dev/null || echo "")

if [ -n "$PORT_80_PROCESS" ]; then
    print_warning "Port 80 is already in use:"
    echo "$PORT_80_PROCESS"
    echo ""
    
    # Check for common services
    if echo "$PORT_80_PROCESS" | grep -q "apache2"; then
        print_status "Apache2 is running on port 80"
        print_warning "Stopping Apache2..."
        sudo systemctl stop apache2
        sudo systemctl disable apache2
        print_success "Apache2 stopped and disabled"
    elif echo "$PORT_80_PROCESS" | grep -q "nginx"; then
        print_status "Nginx is running on port 80"
        print_warning "Stopping system Nginx..."
        sudo systemctl stop nginx
        sudo systemctl disable nginx
        print_success "System Nginx stopped and disabled"
    elif echo "$PORT_80_PROCESS" | grep -q "docker"; then
        print_status "Another Docker container is using port 80"
        print_warning "Stopping all Docker containers..."
        sudo docker stop $(sudo docker ps -q) 2>/dev/null || true
        print_success "Docker containers stopped"
    else
        print_warning "Unknown process using port 80. Please stop it manually."
        echo "Process details:"
        echo "$PORT_80_PROCESS"
        exit 1
    fi
else
    print_success "Port 80 is available"
fi

# Check what's using port 443
print_status "Checking what's using port 443..."
PORT_443_PROCESS=$(sudo lsof -i :443 2>/dev/null || echo "")

if [ -n "$PORT_443_PROCESS" ]; then
    print_warning "Port 443 is already in use:"
    echo "$PORT_443_PROCESS"
    echo ""
    
    # Check for common services
    if echo "$PORT_443_PROCESS" | grep -q "apache2"; then
        print_status "Apache2 is running on port 443"
        print_warning "Stopping Apache2..."
        sudo systemctl stop apache2
        sudo systemctl disable apache2
        print_success "Apache2 stopped and disabled"
    elif echo "$PORT_443_PROCESS" | grep -q "nginx"; then
        print_status "Nginx is running on port 443"
        print_warning "Stopping system Nginx..."
        sudo systemctl stop nginx
        sudo systemctl disable nginx
        print_success "System Nginx stopped and disabled"
    elif echo "$PORT_443_PROCESS" | grep -q "docker"; then
        print_status "Another Docker container is using port 443"
        print_warning "Stopping all Docker containers..."
        sudo docker stop $(sudo docker ps -q) 2>/dev/null || true
        print_success "Docker containers stopped"
    else
        print_warning "Unknown process using port 443. Please stop it manually."
        echo "Process details:"
        echo "$PORT_443_PROCESS"
        exit 1
    fi
else
    print_success "Port 443 is available"
fi

# Verify ports are now free
print_status "Verifying ports are now available..."
if ! sudo lsof -i :80 >/dev/null 2>&1 && ! sudo lsof -i :443 >/dev/null 2>&1; then
    print_success "Ports 80 and 443 are now available!"
    echo ""
    print_status "You can now run the deployment script again:"
    echo "  ./deploy-aws.sh"
else
    print_error "Ports are still in use. Please check manually:"
    echo "  sudo lsof -i :80"
    echo "  sudo lsof -i :443"
    exit 1
fi
