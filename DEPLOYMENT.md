# Deployment Guide

This guide covers deploying the Relative Pointing App on AWS EC2 with nginx and SSL.

## Prerequisites

- AWS EC2 instance (Ubuntu 22.04 LTS recommended)
- SSH key pair for the instance
- Security group allowing ports 22, 80, 443
- Registered domain (optional but recommended for SSL)
- Node.js 18+ installed locally (for building)

## Architecture

```
Users (HTTPS/443)
      ↓
  nginx (reverse proxy)
    ├─ /          → Vue static build (client/dist/)
    └─ /api/*     → Express backend (port 5001)
                        ↓
                  SQLite Database
```

## Quick Deploy (Remote Script)

Build locally and upload to EC2 in one command:

### 1. Configure .env

```bash
cp .env.example .env
```

Edit `.env` with your EC2 details:

```env
EC2_HOST=your-ec2-public-ip
EC2_USER=ubuntu
EC2_KEY_PATH=~/.ssh/your-ec2-key.pem
EC2_DOMAIN=yourdomain.com
AWS_REGION=us-east-2
EC2_APP_DIR=/var/www/relative-pointing
```

### 2. Run Deployment

```bash
chmod +x deploy-remote.sh
./deploy-remote.sh
```

The script will:

- Build the Vue frontend locally with Vite (`npm run build`)
- Upload `client/dist/`, `server/`, and `package*.json` to EC2 via SCP
- Install production dependencies on EC2
- Configure nginx
- Create a systemd service
- Start the backend

### 3. Set Up SSL

After DNS propagation, obtain a Let's Encrypt certificate:

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
sudo certbot --nginx -d yourdomain.com
```

Or use AWS ACM — see the [AWS ACM section](#ssl-with-aws-acm) below.

## Manual Setup (On EC2)

### Install Dependencies

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git nginx

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Set Up Application

```bash
sudo mkdir -p /var/www/relative-pointing/{app,database,logs}
sudo chown -R $USER:$USER /var/www/relative-pointing
cd /var/www/relative-pointing/app

git clone https://github.com/your-username/relative-pointing.git .
npm ci --production
npm run build
```

### Create Environment File

```bash
cat > /var/www/relative-pointing/app/.env << 'EOF'
NODE_ENV=production
PORT=5001
VITE_API_URL=https://yourdomain.com/api
EOF
chmod 600 /var/www/relative-pointing/app/.env
```

### Configure nginx

Create `/etc/nginx/sites-available/relativepointing`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json;

    # Serve Vue static files
    location / {
        root /var/www/relative-pointing/app/client/dist;
        try_files $uri $uri/ /index.html;

        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location /health {
        access_log off;
        proxy_pass http://localhost:5001/api/health;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/relativepointing /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

### Create systemd Service

Create `/etc/systemd/system/relative-pointing-backend.service`:

```ini
[Unit]
Description=Relative Pointing App Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/relative-pointing/app
Environment="NODE_ENV=production"
Environment="PORT=5001"
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable relative-pointing-backend
sudo systemctl start relative-pointing-backend
```

### SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot renew --dry-run  # verify auto-renewal
```

### SSL with AWS ACM

1. Request a certificate in AWS Certificate Manager for your domain
2. Validate via DNS records
3. Export and upload certificate files to EC2:
   ```bash
   sudo mkdir -p /etc/ssl/acm
   sudo mv /tmp/certificate.pem /etc/ssl/acm/
   sudo mv /tmp/private-key.pem /etc/ssl/acm/
   sudo chmod 600 /etc/ssl/acm/private-key.pem
   ```
4. Update nginx config to point to the ACM certificate paths instead of Let's Encrypt

## Operations

### View Logs

```bash
journalctl -u relative-pointing-backend -f        # Backend logs
sudo tail -f /var/log/nginx/access.log             # Nginx access
sudo tail -f /var/log/nginx/error.log              # Nginx errors
```

### Restart Services

```bash
sudo systemctl restart relative-pointing-backend
sudo systemctl reload nginx
```

### Update Application

```bash
cd /var/www/relative-pointing/app
git pull origin main
npm ci --production
npm run build
sudo systemctl restart relative-pointing-backend
```

### Database Backup

```bash
cp server/app.db server/app.db.backup.$(date +%Y%m%d)
```

### Health Check

```bash
curl https://yourdomain.com/api/health
# Returns: {"status":"ok"}
```

## Troubleshooting

### Backend won't start

```bash
sudo systemctl status relative-pointing-backend
journalctl -u relative-pointing-backend -n 50
# Try starting manually:
cd /var/www/relative-pointing/app && node server/server.js
```

### Port in use

```bash
sudo lsof -i :5001
sudo kill -9 <PID>
```

### nginx config errors

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### DNS not resolving

```bash
dig yourdomain.com
nslookup yourdomain.com
# Wait 5-30 minutes after updating DNS records
```

## What Gets Deployed

```
Your Machine                    EC2 Instance
├─ npm run build                /var/www/relative-pointing/app/
├─ client/dist/  ──(scp)──→    ├─ client/dist/  (Vue static files)
├─ server/       ──(scp)──→    ├─ server/       (Node.js backend)
└─ package*.json ──(scp)──→    └─ node_modules/ (production deps)
                                     ↓
                                systemd service on port 5001
                                nginx proxy on port 80/443
```
