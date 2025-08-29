# CollabBoard Deployment Guide

This guide covers deploying CollabBoard to various environments, with a focus on AWS EC2.

## 🚀 AWS EC2 Deployment

### Step 1: Launch EC2 Instance

1. **Choose AMI**: Amazon Linux 2 or Ubuntu 20.04+
2. **Instance Type**: t3.medium or larger (2 vCPU, 4GB RAM minimum)
3. **Storage**: 20GB+ SSD
4. **Security Group**: Configure the following ports:
   ```
   SSH (22) - Your IP only
   HTTP (80) - 0.0.0.0/0
   HTTPS (443) - 0.0.0.0/0
   ```

### Step 2: Server Setup

```bash
# Connect to your instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Update the system
sudo yum update -y

# Install Docker
sudo amazon-linux-extras install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Logout and reconnect for group changes to take effect
exit
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### Step 3: Deploy Application

```bash
# Clone the repository
git clone <your-repository-url>
cd CollabBoard

# Create production environment file
cp env.example .env

# Edit environment variables for production
nano .env
```

#### Production Environment Variables

```env
# Generate a strong JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Use a secure database password
DB_PASSWORD=$(openssl rand -base64 16)

# Set your domain (or use IP if no domain)
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_WS_URL=https://yourdomain.com

# Production settings
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

```bash
# Deploy the application
docker-compose -f docker-compose.yml up -d --build

# Verify deployment
docker-compose ps
docker-compose logs
```

### Step 4: Domain Configuration (Optional)

If you have a domain name:

1. **Point your domain to the EC2 instance**
   - Create an A record pointing to your EC2 public IP
   - Update the environment variables with your domain

2. **Set up Let's Encrypt SSL** (replace self-signed certificates)
   ```bash
   # Install certbot
   sudo yum install certbot -y
   
   # Stop nginx temporarily
   docker-compose stop nginx
   
   # Generate Let's Encrypt certificate
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Copy certificates to nginx volume
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /var/lib/docker/volumes/collabboard_nginx_ssl/_data/server.crt
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /var/lib/docker/volumes/collabboard_nginx_ssl/_data/server.key
   
   # Restart nginx
   docker-compose start nginx
   ```

## 🔐 Security Hardening

### 1. Firewall Configuration

```bash
# Install and configure UFW (Ubuntu) or use AWS Security Groups
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. Fail2Ban (Optional)

```bash
# Install fail2ban to prevent brute force attacks
sudo yum install epel-release -y
sudo yum install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. System Updates

```bash
# Set up automatic security updates
sudo yum install yum-cron -y
sudo systemctl enable yum-cron
sudo systemctl start yum-cron
```

## 📊 Monitoring and Logging

### 1. Application Logs

```bash
# View application logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f nginx
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 2. System Monitoring

```bash
# Monitor system resources
htop

# Monitor Docker containers
docker stats

# Check disk usage
df -h
```

### 3. Log Rotation

```bash
# Configure log rotation for Docker
sudo nano /etc/logrotate.d/docker-containers

# Add the following content:
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
```

## 🔄 Backup and Recovery

### 1. Database Backup

```bash
# Create backup script
cat > /home/ec2-user/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ec2-user/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U collabboard collabboard > $BACKUP_DIR/collabboard_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "collabboard_*.sql" -mtime +7 -delete

echo "Backup completed: collabboard_$DATE.sql"
EOF

chmod +x /home/ec2-user/backup-db.sh

# Set up daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ec2-user/backup-db.sh") | crontab -
```

### 2. Application Backup

```bash
# Backup application files and volumes
cat > /home/ec2-user/backup-app.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ec2-user/backups"
mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm -v collabboard_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_data_$DATE.tar.gz -C /data .
docker run --rm -v collabboard_nginx_ssl:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/nginx_ssl_$DATE.tar.gz -C /data .

echo "Application backup completed: $DATE"
EOF

chmod +x /home/ec2-user/backup-app.sh
```

### 3. Restore from Backup

```bash
# Restore database
cat restore-db.sh << 'EOF'
#!/bin/bash
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql>"
    exit 1
fi

docker-compose exec -T postgres psql -U collabboard -d collabboard < $1
echo "Database restored from $1"
EOF

chmod +x restore-db.sh

# Usage: ./restore-db.sh /path/to/backup.sql
```

## 🔧 Maintenance

### 1. Update Application

```bash
# Update to latest version
cd CollabBoard
git pull origin main

# Rebuild and restart containers
docker-compose down
docker-compose up -d --build

# Clean up old images
docker image prune -f
```

### 2. SSL Certificate Renewal

```bash
# Renew Let's Encrypt certificates (if using)
sudo certbot renew --dry-run

# Set up auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx") | crontab -
```

### 3. Database Maintenance

```bash
# Database cleanup and optimization
docker-compose exec postgres psql -U collabboard -d collabboard -c "VACUUM ANALYZE;"

# Check database size
docker-compose exec postgres psql -U collabboard -d collabboard -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## 🚨 Troubleshooting

### 1. Service Won't Start

```bash
# Check service status
docker-compose ps

# Check specific service logs
docker-compose logs [service_name]

# Restart problematic service
docker-compose restart [service_name]
```

### 2. Database Connection Issues

```bash
# Check postgres connectivity
docker-compose exec postgres pg_isready -U collabboard

# Check database logs
docker-compose logs postgres

# Test connection from backend
docker-compose exec backend node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'postgres',
  user: 'collabboard',
  password: 'collabboard_dev_password',
  database: 'collabboard'
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error(err);
  else console.log('Database connected:', res.rows[0]);
  process.exit(0);
});
"
```

### 3. SSL/HTTPS Issues

```bash
# Check nginx configuration
docker-compose exec nginx nginx -t

# Check SSL certificates
docker-compose exec nginx ls -la /etc/nginx/ssl/

# Test SSL connection
openssl s_client -connect localhost:443 -servername localhost
```

### 4. High Resource Usage

```bash
# Monitor container resource usage
docker stats

# Check disk usage
df -h
du -sh /var/lib/docker/

# Clean up Docker resources
docker system prune -a
docker volume prune
```

## 📈 Scaling Considerations

### Horizontal Scaling

For high-traffic deployments, consider:

1. **Load Balancer**: Use AWS ALB to distribute traffic across multiple instances
2. **Database**: Use AWS RDS PostgreSQL for managed database service
3. **Redis**: Add Redis for session storage and WebSocket scaling
4. **CDN**: Use CloudFront for static asset delivery

### Vertical Scaling

For single-instance scaling:

1. **Upgrade Instance Type**: Move to larger EC2 instance
2. **Optimize Docker**: Adjust container resource limits
3. **Database Tuning**: Optimize PostgreSQL configuration

## 🔗 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NGINX Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
