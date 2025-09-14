#!/bin/bash

# CollabBoard AWS EC2 Deployment Script (Memory Optimized)
# This script builds the frontend locally and deploys to AWS EC2

set -e

echo "🚀 CollabBoard AWS Deployment Script (Memory Optimized)"
echo "======================================================"

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

# Build frontend locally
build_frontend_locally() {
    print_status "Building frontend locally to avoid memory issues on EC2..."
    
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found"
        exit 1
    fi
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm ci
    
    # Build the application
    print_status "Building frontend application..."
    NODE_OPTIONS="--max-old-space-size=4096" npm run build
    
    # Create a tarball of the built files
    print_status "Creating deployment package..."
    tar -czf ../frontend-build.tar.gz .next public package.json package-lock.json
    
    cd ..
    
    print_success "Frontend built locally and packaged"
}

# Deploy to EC2
deploy_to_ec2() {
    print_status "Deploying to EC2..."
    
    # Get EC2 instance details
    echo "Enter your EC2 instance IP address: "
    read EC2_IP
    
    echo "Enter your EC2 username (usually 'ubuntu' or 'ec2-user'): "
    read EC2_USER
    
    if [ -z "$EC2_IP" ] || [ -z "$EC2_USER" ]; then
        print_error "EC2 IP and username are required"
        exit 1
    fi
    
    # Copy files to EC2
    print_status "Copying files to EC2 instance..."
    scp -r . $EC2_USER@$EC2_IP:~/CollabBoard/
    scp frontend-build.tar.gz $EC2_USER@$EC2_IP:~/CollabBoard/
    
    # Run deployment on EC2
    print_status "Running deployment on EC2..."
    ssh $EC2_USER@$EC2_IP << 'EOF'
        cd ~/CollabBoard
        
        # Extract frontend build
        cd frontend
        tar -xzf ../frontend-build.tar.gz
        rm ../frontend-build.tar.gz
        cd ..
        
        # Run the deployment script
        chmod +x deploy-aws.sh
        ./deploy-aws.sh --deploy-only
EOF
    
    print_success "Deployment completed!"
}

# Main function
main() {
    print_status "Starting memory-optimized deployment..."
    
    # Build frontend locally
    build_frontend_locally
    
    # Deploy to EC2
    deploy_to_ec2
    
    print_success "Memory-optimized deployment completed!"
    echo ""
    echo "🌐 Your CollabBoard application should now be accessible on your EC2 instance"
    echo ""
    echo "📋 Useful commands for your EC2 instance:"
    echo "   • View logs: sudo docker-compose -f docker-compose.prod.yml logs -f"
    echo "   • Stop services: sudo docker-compose -f docker-compose.prod.yml down"
    echo "   • Restart services: sudo docker-compose -f docker-compose.prod.yml restart"
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "This script builds the frontend locally and deploys to EC2 to avoid memory issues."
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --build-only   Only build frontend locally"
        exit 0
        ;;
    --build-only)
        build_frontend_locally
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
