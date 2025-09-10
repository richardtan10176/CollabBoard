# CollabBoard AWS EC2 Deployment Guide

This guide will help you deploy CollabBoard to AWS EC2 with proper SSL certificates and production configuration.

## Prerequisites

1. **AWS EC2 Instance**: Ubuntu 20.04 LTS or later
2. **Domain Name**: A domain name pointing to your EC2 instance's public IP
3. **Security Groups**: Configured to allow HTTP (80) and HTTPS (443) traffic
4. **SSH Access**: Ability to connect to your EC2 instance

## Quick Deployment

### 1. Launch EC2 Instance

- **Instance Type**: t3.medium or larger (recommended for production)
- **Storage**: At least 20GB EBS volume
- **Security Groups**: Allow SSH (22), HTTP (80), and HTTPS (443)
- **Key Pair**: Create or use existing key pair

### 2. Connect to EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 3. Clone Repository

```bash
git clone https://github.com/your-username/CollabBoard.git
cd CollabBoard
```

### 4. Run Deployment Script

```bash
chmod +x deploy-aws.sh
./deploy-aws.sh
```

The script will:
- Install Docker and Docker Compose
- Install Certbot for SSL certificates
- Set up environment configuration
- Deploy the application
- Optionally configure SSL certificates

## Manual Deployment Steps

If you prefer to deploy manually or need to troubleshoot:

### 1. Install Dependencies

```bash
# Update system
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx
```

### 2. Configure Environment

```bash
# Copy production environment template
cp env.production .env

# Edit environment variables
nano .env
```

Required environment variables:
- `DB_PASSWORD`: Secure database password
- `JWT_SECRET`: Strong secret key (at least 32 characters)
- `FRONTEND_URL`: Your domain (e.g., https://yourdomain.com)
- `NEXT_PUBLIC_API_URL`: Your domain (e.g., https://yourdomain.com)
- `NEXT_PUBLIC_WS_URL`: Your domain (e.g., https://yourdomain.com)

### 3. Deploy Application

```bash
# Build and start services
sudo docker-compose -f docker-compose.prod.yml up --build -d

# Check service status
sudo docker-compose -f docker-compose.prod.yml ps
```

### 4. Configure SSL Certificates

```bash
# Stop nginx temporarily
sudo docker-compose -f docker-compose.prod.yml stop nginx

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com

# Create nginx SSL directory
sudo mkdir -p /etc/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /etc/nginx/ssl/server.crt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /etc/nginx/ssl/server.key

# Update nginx configuration
sudo sed -i "s/server_name _;/server_name yourdomain.com;/g" nginx/nginx.prod.conf

# Restart nginx
sudo docker-compose -f docker-compose.prod.yml up -d nginx
```

### 5. Setup Auto-Renewal

```bash
# Create renewal cron job
sudo tee /etc/cron.d/certbot-renewal > /dev/null <<EOF
# Renew SSL certificates twice daily
0 12 * * * root certbot renew --quiet --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
0 0 * * * root certbot renew --quiet --deploy-hook "docker-compose -f /home/ubuntu/CollabBoard/docker-compose.prod.yml restart nginx"
EOF
```

## Production Configuration

### Security Groups

Configure your EC2 security group to allow:
- **SSH (22)**: From your IP only
- **HTTP (80)**: From anywhere (0.0.0.0/0)
- **HTTPS (443)**: From anywhere (0.0.0.0/0)

### Environment Variables

Key production environment variables:

```bash
# Database
DB_PASSWORD=your_secure_database_password

# JWT
JWT_SECRET=your_very_secure_jwt_secret_at_least_32_characters_long

# URLs
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_WS_URL=https://yourdomain.com
```

### SSL Configuration

The application uses Let's Encrypt SSL certificates with automatic renewal. The nginx configuration includes:
- HTTP to HTTPS redirect
- Modern SSL/TLS settings
- Security headers
- Rate limiting

## Monitoring and Maintenance

### View Logs

```bash
# All services
sudo docker-compose -f docker-compose.prod.yml logs -f

# Specific service
sudo docker-compose -f docker-compose.prod.yml logs -f backend
sudo docker-compose -f docker-compose.prod.yml logs -f frontend
sudo docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Service Management

```bash
# Start services
sudo docker-compose -f docker-compose.prod.yml up -d

# Stop services
sudo docker-compose -f docker-compose.prod.yml down

# Restart services
sudo docker-compose -f docker-compose.prod.yml restart

# Rebuild and restart
sudo docker-compose -f docker-compose.prod.yml up --build -d
```

### Health Checks

The application includes health check endpoints:
- **Application**: `https://yourdomain.com/health`
- **Backend API**: `https://yourdomain.com/api/health`

### Database Backup

```bash
# Create backup
sudo docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U collabboard collabboard > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
sudo docker-compose -f docker-compose.prod.yml exec -T postgres psql -U collabboard collabboard < backup_file.sql
```

## Updates and Deployment

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
sudo docker-compose -f docker-compose.prod.yml up --build -d
```

### Rollback

```bash
# Checkout previous version
git checkout previous-commit-hash

# Rebuild and restart
sudo docker-compose -f docker-compose.prod.yml up --build -d
```

## Troubleshooting

### Common Issues

1. **Services not starting**: Check logs with `docker-compose logs`
2. **SSL certificate issues**: Verify domain DNS and try manual certbot setup
3. **Database connection issues**: Check environment variables and database health
4. **Port conflicts**: Ensure ports 80 and 443 are not used by other services

### Performance Optimization

1. **Increase instance size** for better performance
2. **Use RDS** for database instead of containerized PostgreSQL
3. **Add CloudFront** for CDN and caching
4. **Use Application Load Balancer** for high availability

### Security Considerations

1. **Regular updates**: Keep system and Docker images updated
2. **Firewall**: Use security groups and consider additional firewall rules
3. **Monitoring**: Set up CloudWatch or other monitoring solutions
4. **Backups**: Regular database and configuration backups

## Support

For issues and questions:
1. Check the logs first
2. Verify environment configuration
3. Ensure all prerequisites are met
4. Check AWS EC2 instance status and security groups

## Architecture

The deployed application consists of:
- **Frontend**: Next.js application (port 3000)
- **Backend**: Express.js API with Socket.IO (port 3001)
- **Database**: PostgreSQL (port 5432)
- **Reverse Proxy**: Nginx with SSL termination (ports 80/443)

All services run in Docker containers with proper networking and health checks.
