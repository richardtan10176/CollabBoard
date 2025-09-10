#!/bin/bash

# CollabBoard Maintenance Script
# This script provides common maintenance tasks for the deployed application

set -e

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

# Function to show usage
show_usage() {
    echo "CollabBoard Maintenance Script"
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status          Show service status"
    echo "  logs            Show application logs"
    echo "  restart         Restart all services"
    echo "  update          Update application from git"
    echo "  backup          Create database backup"
    echo "  restore         Restore database from backup"
    echo "  cleanup         Clean up unused Docker resources"
    echo "  ssl-renew       Renew SSL certificates"
    echo "  health          Check application health"
    echo "  help            Show this help message"
}

# Function to show service status
show_status() {
    print_status "Service Status:"
    sudo docker-compose -f docker-compose.prod.yml ps
    echo ""
    print_status "Docker System Info:"
    sudo docker system df
}

# Function to show logs
show_logs() {
    print_status "Showing application logs (Press Ctrl+C to exit):"
    sudo docker-compose -f docker-compose.prod.yml logs -f
}

# Function to restart services
restart_services() {
    print_status "Restarting all services..."
    sudo docker-compose -f docker-compose.prod.yml restart
    print_success "Services restarted"
}

# Function to update application
update_application() {
    print_status "Updating application..."
    
    # Pull latest changes
    git pull
    
    # Rebuild and restart
    sudo docker-compose -f docker-compose.prod.yml up --build -d
    
    print_success "Application updated"
}

# Function to create database backup
create_backup() {
    print_status "Creating database backup..."
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    sudo docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U collabboard collabboard > "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        print_success "Backup created: $BACKUP_FILE"
    else
        print_error "Backup failed"
        exit 1
    fi
}

# Function to restore database
restore_database() {
    if [ -z "$1" ]; then
        print_error "Please provide backup file: $0 restore <backup_file>"
        exit 1
    fi
    
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    print_warning "This will replace the current database. Are you sure? (y/N)"
    read -r confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_status "Restore cancelled"
        exit 0
    fi
    
    print_status "Restoring database from $BACKUP_FILE..."
    sudo docker-compose -f docker-compose.prod.yml exec -T postgres psql -U collabboard collabboard < "$BACKUP_FILE"
    print_success "Database restored"
}

# Function to cleanup Docker resources
cleanup_docker() {
    print_status "Cleaning up unused Docker resources..."
    
    # Remove unused containers
    sudo docker container prune -f
    
    # Remove unused images
    sudo docker image prune -f
    
    # Remove unused volumes
    sudo docker volume prune -f
    
    # Remove unused networks
    sudo docker network prune -f
    
    print_success "Docker cleanup completed"
}

# Function to renew SSL certificates
renew_ssl() {
    print_status "Renewing SSL certificates..."
    
    # Stop nginx temporarily
    sudo docker-compose -f docker-compose.prod.yml stop nginx
    
    # Renew certificates
    sudo certbot renew --force-renewal
    
    # Copy new certificates
    sudo cp /etc/letsencrypt/live/*/fullchain.pem /etc/nginx/ssl/server.crt
    sudo cp /etc/letsencrypt/live/*/privkey.pem /etc/nginx/ssl/server.key
    
    # Restart nginx
    sudo docker-compose -f docker-compose.prod.yml up -d nginx
    
    print_success "SSL certificates renewed"
}

# Function to check application health
check_health() {
    print_status "Checking application health..."
    
    # Check if services are running
    if ! sudo docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        print_error "Some services are not running"
        sudo docker-compose -f docker-compose.prod.yml ps
        exit 1
    fi
    
    # Check health endpoints
    if curl -f -s http://localhost/health > /dev/null; then
        print_success "Application health check passed"
    else
        print_error "Application health check failed"
        exit 1
    fi
    
    # Check database connection
    if sudo docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U collabboard -d collabboard > /dev/null; then
        print_success "Database health check passed"
    else
        print_error "Database health check failed"
        exit 1
    fi
}

# Main script logic
case "${1:-help}" in
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        restart_services
        ;;
    update)
        update_application
        ;;
    backup)
        create_backup
        ;;
    restore)
        restore_database "$2"
        ;;
    cleanup)
        cleanup_docker
        ;;
    ssl-renew)
        renew_ssl
        ;;
    health)
        check_health
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
