#!/bin/bash

# Relative Pointing App - Production Deployment Script
# This script automates the deployment process on your EC2 instance
#
# Usage:
#   1. Place this script in your app directory
#   2. Run: chmod +x deploy.sh
#   3. Execute: ./deploy.sh [option]
#
# Options:
#   ./deploy.sh setup      - Initial setup (installs packages, creates directories)
#   ./deploy.sh update     - Update from git and rebuild
#   ./deploy.sh restart    - Restart backend service
#   ./deploy.sh logs       - View backend logs
#   ./deploy.sh status     - Check service status

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/relative-pointing/app"
DB_DIR="/var/www/relative-pointing/database"
LOG_DIR="/var/www/relative-pointing/logs"
SERVICE_NAME="relative-pointing-backend"
DOMAIN="relativepointing.app"

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Initial setup
setup() {
    print_header "Initial Setup - Relative Pointing App"
    
    echo "This will set up your Relative Pointing app on this EC2 instance."
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi

    # 1. Update system
    print_header "Updating system packages"
    apt update && apt upgrade -y
    print_success "System packages updated"

    # 2. Install Node.js if not present
    if ! command -v node &> /dev/null; then
        print_header "Installing Node.js 18.x"
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        apt install -y nodejs
        print_success "Node.js installed"
    else
        print_success "Node.js already installed: $(node --version)"
    fi

    # 3. Install nginx if not present
    if ! command -v nginx &> /dev/null; then
        print_header "Installing nginx"
        apt install -y nginx
        systemctl start nginx
        systemctl enable nginx
        print_success "nginx installed and started"
    else
        print_success "nginx already installed"
    fi

    # 4. Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        print_header "Installing certbot (Let's Encrypt)"
        apt install -y certbot python3-certbot-nginx
        print_success "certbot installed"
    else
        print_success "certbot already installed"
    fi

    # 5. Create directories
    print_header "Creating application directories"
    mkdir -p "$APP_DIR"
    mkdir -p "$DB_DIR"
    mkdir -p "$LOG_DIR"
    chmod 755 "$APP_DIR" "$DB_DIR" "$LOG_DIR"
    print_success "Directories created"

    # 6. Clone/pull repository
    print_header "Setting up repository"
    if [ -d "$APP_DIR/.git" ]; then
        cd "$APP_DIR"
        git pull origin main
        print_success "Repository updated"
    else
        print_error "Repository not found. Please clone it manually:"
        echo "  git clone <your-repo-url> $APP_DIR"
        exit 1
    fi

    # 7. Install Node dependencies
    print_header "Installing Node.js dependencies"
    cd "$APP_DIR"
    npm ci --production
    print_success "Dependencies installed"

    # 8. Create .env file
    print_header "Creating environment configuration"
    if [ -f "$APP_DIR/.env" ]; then
        print_warning ".env file already exists, skipping"
    else
        cat > "$APP_DIR/.env" << EOF
NODE_ENV=production
PORT=5000
BACKEND_URL=http://localhost:5001
VITE_API_URL=https://$DOMAIN/api
DATABASE_PATH=$DB_DIR/app.db
EOF
        chmod 600 "$APP_DIR/.env"
        print_success ".env file created"
    fi

    # 9. Build React app
    print_header "Building React frontend"
    cd "$APP_DIR"
    npm run build
    print_success "Frontend built"

    # 10. Create systemd service file
    print_header "Creating systemd service file"
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Relative Pointing App - Backend API Server
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$APP_DIR
Environment="NODE_ENV=production"
Environment="PORT=5000"
Environment="DATABASE_PATH=$DB_DIR/app.db"
Environment="VITE_API_URL=https://$DOMAIN/api"

ExecStart=/usr/bin/npm run start:backend

Restart=on-failure
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

StandardOutput=journal
StandardError=journal
SyslogIdentifier=relative-pointing

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$DB_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    print_success "Systemd service created and enabled"

    # 11. Setup nginx
    print_header "Setting up nginx reverse proxy"
    if [ -f /etc/nginx/sites-available/$DOMAIN ]; then
        print_warning "nginx configuration already exists"
    else
        cat > /etc/nginx/sites-available/$DOMAIN << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name relativepointing.app www.relativepointing.app;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name relativepointing.app www.relativepointing.app;

    ssl_certificate /etc/letsencrypt/live/relativepointing.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relativepointing.app/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;

    access_log /var/log/nginx/relativepointing_access.log combined;
    error_log /var/log/nginx/relativepointing_error.log warn;

    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json;
    gzip_min_length 1000;

    location / {
        root /var/www/relative-pointing/app/client/dist;
        try_files $uri $uri/ /index.html;
        
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF
        
        rm -f /etc/nginx/sites-enabled/default
        ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
        nginx -t && systemctl reload nginx
        print_success "nginx configured"
    fi

    print_header "Setup Complete!"
    echo "Next steps:"
    echo "1. Configure your domain DNS to point to this EC2 instance"
    echo "2. Run: sudo certbot --nginx -d relativepointing.app"
    echo "3. Start the backend: sudo systemctl start $SERVICE_NAME"
    echo "4. Check status: sudo systemctl status $SERVICE_NAME"
    echo ""
    echo "View logs: journalctl -u $SERVICE_NAME -f"
}

# Update from git
update() {
    print_header "Updating Application"
    
    cd "$APP_DIR"
    
    print_warning "Pulling from git..."
    git pull origin main
    print_success "Repository updated"
    
    print_warning "Installing dependencies..."
    npm ci --production
    print_success "Dependencies installed"
    
    print_warning "Building frontend..."
    npm run build
    print_success "Frontend built"
    
    print_header "Update Complete"
    echo "Restart the backend: sudo systemctl restart $SERVICE_NAME"
}

# Restart service
restart_service() {
    print_header "Restarting Service"
    systemctl restart $SERVICE_NAME
    print_success "Service restarted"
    sleep 2
    systemctl status $SERVICE_NAME
}

# View logs
view_logs() {
    print_header "Backend Logs (Ctrl+C to exit)"
    journalctl -u $SERVICE_NAME -f --no-hostname -o short-iso
}

# Check status
check_status() {
    print_header "Service Status"
    systemctl status $SERVICE_NAME
    echo ""
    echo "Recent logs:"
    journalctl -u $SERVICE_NAME -n 20 --no-hostname -o short-iso
}

# Main script logic
case "${1:-status}" in
    setup)
        check_root
        setup
        ;;
    update)
        check_root
        update
        ;;
    restart)
        check_root
        restart_service
        ;;
    logs)
        view_logs
        ;;
    status)
        check_status
        ;;
    *)
        echo "Relative Pointing App - Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup      - Initial setup (run once)"
        echo "  update     - Update from git and rebuild"
        echo "  restart    - Restart backend service"
        echo "  logs       - View backend logs in real-time"
        echo "  status     - Check service status"
        echo ""
        echo "Examples:"
        echo "  sudo $0 setup"
        echo "  sudo $0 update"
        echo "  $0 logs"
        ;;
esac
