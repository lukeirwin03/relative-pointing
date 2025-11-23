# Deployment Guide - Relative Pointing App

This guide covers deploying the Relative Pointing application on an AWS EC2 instance with nginx as a reverse proxy and Let's Encrypt SSL certificates.

## Prerequisites

- AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- Registered domain (e.g., `relativepointing.app`)
- SSH access to your EC2 instance
- Basic familiarity with Linux/bash

## Architecture Overview

```
User Browser → HTTPS (443)
                    ↓
              nginx (reverse proxy)
                    ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
React Frontend App (static)    Express Backend API
(nginx serves /build)          (Node.js on port 5000)
                                    ↓
                            SQLite Database
                       (/var/www/relative-pointing/database/app.db)
```

## Deployment Checklist

- [ ] Phase 1: EC2 Instance Setup
- [ ] Phase 2: Application Setup
- [ ] Phase 3: Nginx Configuration
- [ ] Phase 4: SSL Certificate Setup
- [ ] Phase 5: Process Management (Systemd)
- [ ] Phase 6: Domain Configuration
- [ ] Phase 7: Testing

---

## Phase 1: EC2 Instance Setup

### 1.1 Security Group Configuration

In AWS Console:
1. Go to EC2 → Security Groups
2. Edit inbound rules to allow:
   - **Port 22** (SSH): Your IP or 0.0.0.0/0 (not recommended for production)
   - **Port 80** (HTTP): 0.0.0.0/0 (for Let's Encrypt validation)
   - **Port 443** (HTTPS): 0.0.0.0/0

### 1.2 System Updates

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y \
  build-essential \
  curl \
  wget \
  git \
  vim \
  htop
```

### 1.3 Install Node.js 18.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x or higher
```

### 1.4 Install Nginx

```bash
sudo apt install -y nginx

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify it's running
sudo systemctl status nginx
```

### 1.5 Install Certbot for SSL

```bash
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

---

## Phase 2: Application Setup

### 2.1 Create Application Directory Structure

```bash
# Create directory structure
sudo mkdir -p /var/www/relative-pointing/{app,database,logs}

# Set ownership to current user (you can change this to www-data if needed)
sudo chown -R $USER:$USER /var/www/relative-pointing
chmod -R 755 /var/www/relative-pointing
```

### 2.2 Clone Repository

```bash
cd /var/www/relative-pointing/app

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/your-username/relative-pointing.git .

# Or if already initialized:
git pull origin main
```

### 2.3 Install Dependencies

```bash
cd /var/www/relative-pointing/app

# Install production dependencies
npm ci --production

# If you need to update lockfile
# npm install
```

### 2.4 Create Environment File

```bash
# Create .env file
cat > /var/www/relative-pointing/app/.env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000
BACKEND_URL=http://localhost:5000

# Frontend Configuration
REACT_APP_API_URL=https://relativepointing.app/api

# Database Configuration
DATABASE_PATH=/var/www/relative-pointing/database/app.db
EOF

# Secure the .env file
chmod 600 /var/www/relative-pointing/app/.env
```

### 2.5 Build React Frontend

```bash
cd /var/www/relative-pointing/app

# Build the React app for production
npm run build

# Verify build completed
ls -la build/
```

### 2.6 Verify Backend Startup

```bash
# Test if backend starts successfully
cd /var/www/relative-pointing/app
npm run start:backend &

# Check if it's listening on port 5000
sleep 3
curl http://localhost:5000/api/health

# Kill the background process
pkill -f "npm run start:backend" || pkill -f "node server"
```

---

## Phase 3: Nginx Configuration

### 3.1 Create Nginx Configuration File

Create `/etc/nginx/sites-available/relativepointing.app`:

```bash
sudo tee /etc/nginx/sites-available/relativepointing.app > /dev/null << 'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name relativepointing.app www.relativepointing.app;
    
    # Allow Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name relativepointing.app www.relativepointing.app;

    # SSL Certificate Paths (will be populated by certbot)
    ssl_certificate /etc/letsencrypt/live/relativepointing.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relativepointing.app/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/relativepointing_access.log combined;
    error_log /var/log/nginx/relativepointing_error.log warn;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json;
    gzip_min_length 1000;
    gzip_comp_level 6;

    # Serve React static files
    location / {
        root /var/www/relative-pointing/app/build;
        try_files $uri $uri/ /index.html;
        
        # Cache busting for index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed in future)
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:5000/api/health;
    }
}
EOF
```

### 3.2 Enable the Site

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/relativepointing.app \
           /etc/nginx/sites-enabled/relativepointing.app

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Should output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 3.3 Start Nginx

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

---

## Phase 4: SSL Certificate Setup with Let's Encrypt

### 4.1 Prerequisites

**Important:** Before setting up SSL, your domain must be pointing to your EC2 instance's public IP address. See Phase 6 for DNS configuration.

### 4.2 Obtain Certificate

```bash
# Run certbot to obtain and install certificate
sudo certbot --nginx -d relativepointing.app -d www.relativepointing.app

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service (A)
# - Opt in or out of EFF mailing list (your choice)
# - Select option 2 to redirect HTTP to HTTPS
```

### 4.3 Verify Certificate Installation

```bash
# Check certificate details
sudo certbot certificates

# Test the HTTPS connection
curl https://relativepointing.app/

# You should see the HTML of your app
```

### 4.4 Auto-Renewal Setup

```bash
# Check auto-renewal status
sudo systemctl status certbot.timer

# Test renewal process (dry run)
sudo certbot renew --dry-run

# Auto-renewal should be enabled by default
# Verify with:
sudo systemctl list-timers certbot
```

---

## Phase 5: Process Management with Systemd

### 5.1 Create Backend Service

Create `/etc/systemd/system/relative-pointing-backend.service`:

```bash
sudo tee /etc/systemd/system/relative-pointing-backend.service > /dev/null << 'EOF'
[Unit]
Description=Relative Pointing App Backend
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/relative-pointing/app
Environment="NODE_ENV=production"
Environment="PORT=5000"
Environment="DATABASE_PATH=/var/www/relative-pointing/database/app.db"
Environment="REACT_APP_API_URL=https://relativepointing.app/api"

# Use npm to run the backend
ExecStart=/usr/bin/npm run start:backend

# Restart policy
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=relative-pointing-backend

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd daemon
sudo systemctl daemon-reload
```

### 5.2 Create Frontend Service (Optional)

If you want to serve the frontend through a Node.js dev server (not recommended for production - nginx static serving is better):

```bash
sudo tee /etc/systemd/system/relative-pointing-frontend.service > /dev/null << 'EOF'
[Unit]
Description=Relative Pointing App Frontend Build
After=network.target
Before=relative-pointing-backend.service

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/var/www/relative-pointing/app
Environment="NODE_ENV=production"

# Build the frontend (runs once)
ExecStart=/usr/bin/npm run build

RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
```

### 5.3 Enable and Start Services

```bash
# Enable backend service to start on boot
sudo systemctl enable relative-pointing-backend

# Start the backend service
sudo systemctl start relative-pointing-backend

# Check status
sudo systemctl status relative-pointing-backend

# View logs
journalctl -u relative-pointing-backend -f
```

### 5.4 Service Management Commands

```bash
# Start/Stop/Restart services
sudo systemctl start relative-pointing-backend
sudo systemctl stop relative-pointing-backend
sudo systemctl restart relative-pointing-backend

# View status
sudo systemctl status relative-pointing-backend

# View logs (last 50 lines)
journalctl -u relative-pointing-backend -n 50

# Stream logs in real-time
journalctl -u relative-pointing-backend -f

# View logs with timestamps and service name
journalctl -u relative-pointing-backend --no-hostname -o short-iso
```

---

## Phase 6: Domain Configuration

### 6.1 Get Your EC2 Instance Public IP

```bash
# In your AWS Console:
# EC2 → Instances → Select your instance → Copy "Public IPv4 address"

# Or from command line:
curl http://169.254.169.254/latest/meta-data/public-ipv4
```

### 6.2 Configure DNS Records

In your domain registrar (GoDaddy, Namecheap, etc.):

1. Go to DNS Settings
2. Find "A Records" section
3. Create/Edit A record:
   - **Host/Name:** `@` (or leave blank)
   - **Type:** A
   - **Value:** Your EC2 public IP
   - **TTL:** 3600 (or default)

4. Optionally add www subdomain:
   - **Host/Name:** `www`
   - **Type:** A
   - **Value:** Your EC2 public IP

### 6.3 Verify DNS Propagation

```bash
# Test DNS resolution (wait 5-30 minutes after updating)
nslookup relativepointing.app

# Should show your EC2 public IP

# Or use:
dig relativepointing.app

# Test with curl
curl -I https://relativepointing.app
```

---

## Phase 7: Testing

### 7.1 Test Backend

```bash
# Check health endpoint
curl https://relativepointing.app/api/health

# Expected response:
# {"status":"ok"}
```

### 7.2 Test Frontend

```bash
# Visit the website
curl https://relativepointing.app/

# Or open in browser: https://relativepointing.app
```

### 7.3 Test Creating a Session

```bash
# Create a session via API
curl -X POST https://relativepointing.app/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"creatorId": "550e8400-e29b-41d4-a716-446655440000", "creatorName": "Test User"}'

# Should return:
# {"sessionId":"...", "roomCode":"...", "creatorId":"...", "creatorName":"Test User"}
```

### 7.4 Check Logs

```bash
# Backend logs
journalctl -u relative-pointing-backend -f

# Nginx access logs
sudo tail -f /var/log/nginx/relativepointing_access.log

# Nginx error logs
sudo tail -f /var/log/nginx/relativepointing_error.log
```

---

## Maintenance

### Database Backups

```bash
# Backup database
cp /var/www/relative-pointing/database/app.db \
   /var/www/relative-pointing/database/app.db.backup.$(date +%Y%m%d_%H%M%S)

# To restore from backup
cp /var/www/relative-pointing/database/app.db.backup.20240101_120000 \
   /var/www/relative-pointing/database/app.db
```

### Update Application

```bash
cd /var/www/relative-pointing/app

# Pull latest changes
git pull origin main

# Install any new dependencies
npm ci --production

# Rebuild frontend
npm run build

# Restart backend
sudo systemctl restart relative-pointing-backend

# Nginx will automatically serve the new build
sudo systemctl reload nginx
```

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Check specific directory
du -sh /var/www/relative-pointing/

# View logs size
du -sh /var/log/nginx/
```

### SSL Certificate Renewal

```bash
# Manual renewal
sudo certbot renew

# Check renewal status
sudo systemctl status certbot.timer

# View certificates
sudo certbot certificates
```

---

## Troubleshooting

### Port 5000 Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>

# Or restart the service
sudo systemctl restart relative-pointing-backend
```

### Nginx Config Errors

```bash
# Test nginx configuration
sudo nginx -t

# View detailed error logs
sudo tail -f /var/log/nginx/error.log
```

### Backend Won't Start

```bash
# Check service status and logs
sudo systemctl status relative-pointing-backend
journalctl -u relative-pointing-backend -n 50

# Try starting manually to see error
cd /var/www/relative-pointing/app
npm run start:backend
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Manual renewal
sudo certbot renew --force-renewal

# Check Let's Encrypt logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### DNS Not Resolving

```bash
# Clear local DNS cache
sudo systemctl restart systemd-resolved

# Check DNS records
dig relativepointing.app
nslookup relativepointing.app

# Use Google DNS to test
dig @8.8.8.8 relativepointing.app
```

---

## Quick Reference Commands

```bash
# Application directory
cd /var/www/relative-pointing/app

# Start/Stop services
sudo systemctl start relative-pointing-backend
sudo systemctl stop relative-pointing-backend
sudo systemctl restart relative-pointing-backend

# View logs
journalctl -u relative-pointing-backend -f
sudo tail -f /var/log/nginx/relativepointing_access.log

# Deploy updates
git pull origin main
npm ci --production
npm run build
sudo systemctl restart relative-pointing-backend

# Check health
curl https://relativepointing.app/api/health
curl https://relativepointing.app/

# Database backup
cp /var/www/relative-pointing/database/app.db /var/www/relative-pointing/database/app.db.backup

# Restart nginx
sudo systemctl reload nginx
```

---

## Next Steps

1. **Monitor your application**: Set up monitoring/alerting (CloudWatch, Uptime Robot)
2. **Scale database**: As you grow, consider migrating from SQLite to PostgreSQL
3. **Add analytics**: Track user sessions and feature usage
4. **Backup automation**: Set up automated database backups to S3
5. **CI/CD pipeline**: Automate deployments with GitHub Actions or similar

---

For questions or issues, check the troubleshooting section or review logs with `journalctl` and `tail`.
