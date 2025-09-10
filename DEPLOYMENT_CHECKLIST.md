# CollabBoard AWS Deployment Checklist

## Pre-Deployment

- [ ] **AWS Account Setup**
  - [ ] AWS account created and configured
  - [ ] AWS CLI installed and configured
  - [ ] Appropriate IAM permissions for EC2, CloudFormation

- [ ] **Domain Setup**
  - [ ] Domain name purchased/configured
  - [ ] DNS records pointing to EC2 instance (A record)
  - [ ] Domain verified and accessible

- [ ] **Security Preparation**
  - [ ] SSH key pair created in AWS
  - [ ] Security groups planned (SSH, HTTP, HTTPS)
  - [ ] Firewall rules configured

## Infrastructure Deployment

### Option 1: CloudFormation (Recommended)
- [ ] **CloudFormation Stack**
  - [ ] Review `aws-infrastructure.yml` template
  - [ ] Deploy stack with required parameters:
    ```bash
    aws cloudformation create-stack \
      --stack-name collabboard-infrastructure \
      --template-body file://aws-infrastructure.yml \
      --parameters ParameterKey=KeyPairName,ParameterValue=your-key-pair \
                   ParameterKey=InstanceType,ParameterValue=t3.medium \
                   ParameterKey=DomainName,ParameterValue=yourdomain.com \
      --capabilities CAPABILITY_IAM
    ```
  - [ ] Wait for stack creation to complete
  - [ ] Note the public IP and instance details

### Option 2: Manual EC2 Setup
- [ ] **EC2 Instance**
  - [ ] Launch Ubuntu 20.04 LTS instance
  - [ ] Configure security groups (SSH, HTTP, HTTPS)
  - [ ] Attach Elastic IP (recommended)
  - [ ] Configure storage (minimum 20GB)

## Application Deployment

- [ ] **Connect to Instance**
  ```bash
  ssh -i your-key.pem ubuntu@your-ec2-ip
  ```

- [ ] **Clone Repository**
  ```bash
  git clone https://github.com/your-username/CollabBoard.git
  cd CollabBoard
  ```

- [ ] **Run Deployment Script**
  ```bash
  chmod +x deploy-aws.sh
  ./deploy-aws.sh
  ```

- [ ] **Configure Environment**
  - [ ] Edit `.env` file with production values:
    - [ ] `DB_PASSWORD`: Secure database password
    - [ ] `JWT_SECRET`: Strong secret key (32+ characters)
    - [ ] `FRONTEND_URL`: Your domain (https://yourdomain.com)
    - [ ] `NEXT_PUBLIC_API_URL`: Your domain (https://yourdomain.com)
    - [ ] `NEXT_PUBLIC_WS_URL`: Your domain (https://yourdomain.com)

## SSL Certificate Setup

- [ ] **SSL Configuration**
  - [ ] Run SSL setup during deployment or manually:
    ```bash
    ./deploy-aws.sh --ssl-only
    ```
  - [ ] Verify certificate installation
  - [ ] Test HTTPS access
  - [ ] Confirm auto-renewal setup

## Post-Deployment Verification

- [ ] **Application Health**
  - [ ] HTTP access: `http://your-ec2-ip`
  - [ ] HTTPS access: `https://yourdomain.com`
  - [ ] Health endpoint: `https://yourdomain.com/health`
  - [ ] API endpoint: `https://yourdomain.com/api/health`

- [ ] **Service Status**
  ```bash
  ./maintenance.sh status
  ./maintenance.sh health
  ```

- [ ] **Logs Verification**
  ```bash
  ./maintenance.sh logs
  ```

## Security Hardening

- [ ] **System Security**
  - [ ] Update system packages: `sudo apt update && sudo apt upgrade`
  - [ ] Configure fail2ban for SSH protection
  - [ ] Set up regular security updates
  - [ ] Review and restrict SSH access

- [ ] **Application Security**
  - [ ] Verify environment variables are secure
  - [ ] Check SSL certificate validity
  - [ ] Test rate limiting functionality
  - [ ] Verify security headers in browser

## Monitoring Setup

- [ ] **CloudWatch Integration**
  - [ ] Verify CloudWatch agent is running
  - [ ] Check log groups in AWS Console
  - [ ] Set up basic monitoring alerts

- [ ] **Application Monitoring**
  - [ ] Test health check endpoints
  - [ ] Monitor application logs
  - [ ] Set up database backup schedule

## Backup and Recovery

- [ ] **Database Backup**
  ```bash
  ./maintenance.sh backup
  ```

- [ ] **Configuration Backup**
  - [ ] Backup `.env` file
  - [ ] Backup SSL certificates
  - [ ] Document custom configurations

## Performance Optimization

- [ ] **Instance Optimization**
  - [ ] Monitor CPU and memory usage
  - [ ] Consider instance type upgrade if needed
  - [ ] Optimize Docker container resources

- [ ] **Application Optimization**
  - [ ] Enable gzip compression (already configured)
  - [ ] Monitor database performance
  - [ ] Consider CDN for static assets

## Documentation

- [ ] **Deployment Documentation**
  - [ ] Document custom configurations
  - [ ] Record any manual steps taken
  - [ ] Create runbook for common tasks

- [ ] **Team Access**
  - [ ] Share SSH keys with team members
  - [ ] Document access procedures
  - [ ] Set up monitoring alerts

## Go-Live Checklist

- [ ] **Final Verification**
  - [ ] All health checks passing
  - [ ] SSL certificate valid and auto-renewing
  - [ ] Database backups working
  - [ ] Monitoring in place
  - [ ] Team has access and documentation

- [ ] **DNS Cutover**
  - [ ] Update DNS records to point to production
  - [ ] Verify domain resolution
  - [ ] Test from multiple locations

- [ ] **Launch**
  - [ ] Announce application availability
  - [ ] Monitor for issues
  - [ ] Be ready to rollback if needed

## Post-Launch

- [ ] **Monitoring**
  - [ ] Watch application metrics
  - [ ] Monitor error rates
  - [ ] Check user feedback

- [ ] **Maintenance**
  - [ ] Schedule regular updates
  - [ ] Plan for scaling if needed
  - [ ] Regular security reviews

## Emergency Procedures

- [ ] **Rollback Plan**
  - [ ] Document rollback procedures
  - [ ] Test rollback process
  - [ ] Keep previous version ready

- [ ] **Incident Response**
  - [ ] Document escalation procedures
  - [ ] Set up alerting
  - [ ] Prepare communication plan

---

## Quick Commands Reference

```bash
# Deploy application
./deploy-aws.sh

# Check status
./maintenance.sh status

# View logs
./maintenance.sh logs

# Create backup
./maintenance.sh backup

# Update application
./maintenance.sh update

# Health check
./maintenance.sh health

# SSL renewal
./maintenance.sh ssl-renew
```
