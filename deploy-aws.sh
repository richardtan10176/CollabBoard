#!/bin/bash

# CollabBoard AWS EC2 Deployment Script
# This script helps deploy CollabBoard to AWS EC2

set -e

echo "🚀 CollabBoard AWS Deployment Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running on EC2
check_ec2() {
    if ! curl -s --max-time 5 http://169.254.169.254/latest/meta-data/instance-id > /dev/null; then
        print_error "This script should be run on an AWS EC2 instance"
        exit 1
    fi
    print_success "Running on EC2 instance"
}

# Install Docker and Docker Compose
install_docker() {
    print_status "Installing Docker and Docker Compose..."
    
    # Update package index
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Set up the stable repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    print_success "Docker and Docker Compose installed"
    print_warning "You may need to log out and back in for Docker group changes to take effect"
}

# Install Certbot for SSL certificates
install_certbot() {
    print_status "Installing Certbot for SSL certificates..."
    
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
    
    print_success "Certbot installed"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f env.production ]; then
            cp env.production .env
            print_success "Created .env from env.production template"
        else
            print_error "No env.production template found"
            exit 1
        fi
    else
        print_warning ".env file already exists"
    fi
    
    print_warning "IMPORTANT: Please edit .env file with your production values:"
    echo "  - DB_PASSWORD: Set a secure database password"
    echo "  - JWT_SECRET: Set a strong secret key (at least 32 characters)"
    echo "  - FRONTEND_URL: Set your domain (e.g., https://yourdomain.com)"
    echo "  - NEXT_PUBLIC_API_URL: Set your domain (e.g., https://yourdomain.com)"
    echo "  - NEXT_PUBLIC_WS_URL: Set your domain (e.g., https://yourdomain.com)"
    echo ""
    read -p "Press Enter after editing .env file..."
}

# Setup SSL certificates
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    # Get domain from user
    read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN
    
    if [ -z "$DOMAIN" ]; then
        print_error "Domain name is required"
        exit 1
    fi
    
    # Stop nginx temporarily
    sudo docker-compose -f docker-compose.prod.yml stop nginx
    
    # Get SSL certificate
    sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    # Create nginx SSL directory
    sudo mkdir -p /etc/nginx/ssl
    
    # Copy certificates to nginx directory
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/server.crt
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/server.key
    
    # Update nginx configuration with domain
    sudo sed -i "s/server_name _;/server_name $DOMAIN;/g" nginx/nginx.prod.conf
    
    print_success "SSL certificates configured for $DOMAIN"
}

# Deploy application
deploy_app() {
    print_status "Deploying CollabBoard application..."
    
    # Build and start services
    sudo docker-compose -f docker-compose.prod.yml up --build -d
    
    # Wait for services to be healthy
    print_status "Waiting for services to start..."
    sleep 30
    
    # Check service status
    sudo docker-compose -f docker-compose.prod.yml ps
    
    print_success "Application deployed successfully!"
}

# Setup auto-renewal for SSL certificates
setup_ssl_renewal() {
    print_status "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    sudo tee /etc/cron.d/certbot-renewal > /dev/null <<EOF
# Renew SSL certificates twice daily
0 12 * * * root certbot renew --quiet --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
0 0 * * * root certbot renew --quiet --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
EOF
    
    print_success "SSL certificate auto-renewal configured"
}

# Main deployment function
main() {
    print_status "Starting AWS EC2 deployment..."
    
    # Check if running on EC2
    check_ec2
    
    # Install dependencies
    install_docker
    install_certbot
    
    # Setup environment
    setup_environment
    
    # Deploy application
    deploy_app
    
    # Setup SSL (optional)
    read -p "Do you want to setup SSL certificates now? (y/n): " setup_ssl_choice
    if [[ $setup_ssl_choice =~ ^[Yy]$ ]]; then
        setup_ssl
        setup_ssl_renewal
    fi
    
    print_success "Deployment completed!"
    echo ""
    echo "🌐 Your CollabBoard application should now be accessible at:"
    echo "   • HTTP: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
    if [[ $setup_ssl_choice =~ ^[Yy]$ ]]; then
        echo "   • HTTPS: https://$DOMAIN"
    fi
    echo ""
    echo "📋 Useful commands:"
    echo "   • View logs: sudo docker-compose -f docker-compose.prod.yml logs -f"
    echo "   • Stop services: sudo docker-compose -f docker-compose.prod.yml down"
    echo "   • Restart services: sudo docker-compose -f docker-compose.prod.yml restart"
    echo "   • View status: sudo docker-compose -f docker-compose.prod.yml ps"
    echo ""
    echo "🔧 To update the application:"
    echo "   1. Pull latest changes: git pull"
    echo "   2. Rebuild and restart: sudo docker-compose -f docker-compose.prod.yml up --build -d"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --ssl-only     Only setup SSL certificates"
        echo "  --deploy-only  Only deploy application (skip SSL setup)"
        exit 0
        ;;
    --ssl-only)
        setup_ssl
        setup_ssl_renewal
        exit 0
        ;;
    --deploy-only)
        check_ec2
        install_docker
        setup_environment
        deploy_app
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use $0 --help for usage information"
        exit 1
        ;;
esac
