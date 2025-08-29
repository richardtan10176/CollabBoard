#!/bin/bash

# CollabBoard Startup Script
# This script helps start the application in different environments

set -e

echo "🚀 Starting CollabBoard..."

# Check if Docker is running
# if ! docker info > /dev/null 2>&1; then
#     echo "❌ Docker is not running. Please start Docker first."
#     exit 1
# fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Parse command line arguments
ENVIRONMENT="development"
BUILD_FLAG="--build"
DETACH_FLAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --prod|--production)
            ENVIRONMENT="production"
            shift
            ;;
        --no-build)
            BUILD_FLAG=""
            shift
            ;;
        -d|--detach)
            DETACH_FLAG="-d"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --prod, --production  Start in production mode"
            echo "  --no-build           Skip building images"
            echo "  -d, --detach         Run in background"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use $0 --help for usage information"
            exit 1
            ;;
    esac
done

echo "📝 Environment: $ENVIRONMENT"

# Set up environment file if it doesn't exist
if [ ! -f .env ] && [ "$ENVIRONMENT" = "production" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp env.example .env
    echo "✏️  Please edit .env with your production values before continuing."
    echo "    Required changes:"
    echo "    - JWT_SECRET: Use a strong secret key"
    echo "    - DB_PASSWORD: Use a secure database password"
    echo "    - FRONTEND_URL/NEXT_PUBLIC_*_URL: Set your domain"
    read -p "Press Enter after editing .env file..."
fi

# Choose docker-compose configuration
if [ "$ENVIRONMENT" = "production" ]; then
    COMPOSE_FILE="docker-compose.yml"
    echo "🏭 Using production configuration"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "🔧 Using development configuration (with overrides)"
fi

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose -f $COMPOSE_FILE down

# Start the application
echo "🏗️  Starting CollabBoard containers..."
if [ -n "$BUILD_FLAG" ]; then
    echo "🔨 Building images..."
fi

docker-compose -f $COMPOSE_FILE up $BUILD_FLAG $DETACH_FLAG

if [ -n "$DETACH_FLAG" ]; then
    echo ""
    echo "✅ CollabBoard started in background!"
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
    echo ""
    echo "🌐 Access the application:"
    echo "   • Frontend: https://localhost"
    echo "   • API: https://localhost/api"
    echo ""
    echo "📋 Useful commands:"
    echo "   • View logs: docker-compose logs -f"
    echo "   • Stop services: docker-compose down"
    echo "   • View status: docker-compose ps"
else
    echo ""
    echo "✅ CollabBoard is running!"
    echo "🌐 Access the application at: https://localhost"
    echo "📝 Default admin credentials: admin / admin123"
    echo ""
    echo "Press Ctrl+C to stop..."
fi
