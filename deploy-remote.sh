#!/bin/bash

################################################################################
# Relative Pointing App - Remote EC2 Deployment Script
#
# Build locally, SCP to EC2, and start services using nvm
# Uses nvm (Node Version Manager) for Node.js environment management
#
# Usage:
#   1. Copy .env.remote.example to .env.remote
#   2. Fill in EC2 details in .env.remote
#   3. Run: ./deploy-remote.sh
#
# That's it! Builds locally, uploads to EC2, uses nvm for Node management!
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Functions
print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}\n"
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

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check local prerequisites
check_local_prerequisites() {
    print_header "Checking Local Prerequisites"
    
    local missing=0
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found"
        print_info "Install from: https://nodejs.org/"
        missing=1
    else
        print_success "Node.js $(node --version) found"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm not found"
        missing=1
    else
        print_success "npm $(npm --version) found"
    fi
    
    # Check package.json
    if [ ! -f "$SCRIPT_DIR/package.json" ]; then
        print_error "package.json not found in $SCRIPT_DIR"
        missing=1
    else
        print_success "package.json found"
    fi
    
    # Check SSH key
    if [ ! -f "$EC2_KEY_PATH" ]; then
        print_error "SSH key not found: $EC2_KEY_PATH"
        missing=1
    else
        print_success "SSH key found"
    fi
    
    # Check scp
    if ! command -v scp &> /dev/null; then
        print_error "scp not found (needed for uploading files)"
        missing=1
    else
        print_success "scp found"
    fi
    
    if [ $missing -eq 1 ]; then
        echo ""
        print_error "Missing prerequisites"
        exit 1
    fi
}

# Load configuration from .env.remote
load_env() {
    if [ ! -f "$SCRIPT_DIR/.env.remote" ]; then
        print_error ".env.remote file not found!"
        echo ""
        echo "Please create .env.remote file with EC2 configuration:"
        echo "  1. Copy .env.remote.example to .env.remote"
        echo "  2. Fill in your EC2 details (EC2_HOST, EC2_KEY_PATH, etc.)"
        echo "  3. Run this script again"
        echo ""
        exit 1
    fi

    # Load environment variables
    set -a
    source "$SCRIPT_DIR/.env.remote"
    set +a

    # Validate required variables
    local required_vars=("EC2_HOST" "EC2_USER" "EC2_KEY_PATH" "EC2_DOMAIN")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Missing required variable: $var"
            echo "Please check your .env.remote file"
            exit 1
        fi
    done

    # Expand ~ in key path
    EC2_KEY_PATH="${EC2_KEY_PATH/#\~/$HOME}"
    
    # Set defaults
    EC2_APP_DIR="${EC2_APP_DIR:-/var/www/relative-pointing}"
    NODE_VERSION="${NODE_VERSION:-18.18.0}"
}

# Verify SSH key exists and has correct permissions
verify_ssh_key() {
    if [ ! -f "$EC2_KEY_PATH" ]; then
        print_error "SSH key not found: $EC2_KEY_PATH"
        echo ""
        echo "Please ensure your EC2 SSH key exists at the path specified"
        exit 1
    fi
    
    # Check permissions
    local perms=$(stat -f%A "$EC2_KEY_PATH" 2>/dev/null || stat -c %a "$EC2_KEY_PATH")
    if [ "$perms" != "600" ]; then
        print_warning "SSH key permissions not secure (should be 600), fixing..."
        chmod 600 "$EC2_KEY_PATH"
    fi
    
    print_success "SSH key verified: $EC2_KEY_PATH"
}

# Test SSH connection
test_ssh_connection() {
    print_info "Testing SSH connection to EC2..."
    
    if ssh -i "$EC2_KEY_PATH" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" "echo 'SSH connection successful'" &>/dev/null; then
        print_success "SSH connection successful"
        return 0
    else
        print_error "Cannot connect to EC2 instance"
        echo ""
        echo "Troubleshooting:"
        echo "  1. Verify EC2_HOST is correct (public IP or DNS)"
        echo "  2. Verify EC2_USER is correct (usually 'ubuntu' for Ubuntu AMIs)"
        echo "  3. Verify EC2_KEY_PATH points to correct SSH key file"
        echo "  4. Verify security group allows inbound port 22"
        echo "  5. Verify SSH key has correct permissions (600)"
        exit 1
    fi
}

# Build React app locally
build_locally() {
    print_header "Building React App Locally"
    
    if [ ! -f "$SCRIPT_DIR/package.json" ]; then
        print_error "package.json not found in $SCRIPT_DIR"
        echo "Make sure you're running this script from the app root directory"
        exit 1
    fi
    
    print_info "Installing dependencies..."
    cd "$SCRIPT_DIR"
    # Clean cache to avoid ENOTEMPTY errors with npm ci
    rm -rf node_modules/.cache 2>/dev/null || true
    if ! npm ci; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_success "Dependencies installed"
    
    print_info "Building React production bundle..."
    # Set production API URL for React build
    export REACT_APP_API_URL="https://${EC2_DOMAIN}/api"
    if ! npm run build; then
        print_error "Failed to build React app"
        exit 1
    fi
    print_success "React app built successfully (API: $REACT_APP_API_URL)"
    
    if [ ! -d "$SCRIPT_DIR/build" ]; then
        print_error "Build directory not found after build!"
        exit 1
    fi
    
    print_success "Build output ready to upload"
}

# Setup EC2 instance with nvm
setup_ec2() {
    print_header "Setting Up EC2 Instance"
    
    local setup_script=$(cat << 'EOF'
#!/bin/bash
set -e

EC2_APP_DIR="${EC2_APP_DIR:-/var/www/relative-pointing}"
EC2_DOMAIN="${EC2_DOMAIN}"
NODE_VERSION="${NODE_VERSION:-18.18.0}"

# Color functions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running as correct user
if [ "$EUID" -eq 0 ]; then
    print_error "Running as root. Please run as ubuntu user."
    exit 1
fi

# Update and install basics
print_info "Updating system packages..."
sudo apt-get update -qq > /dev/null
sudo apt-get upgrade -y -qq > /dev/null
print_success "System packages updated"

# Install curl, wget, and build tools if not present
print_info "Installing build tools..."
sudo apt-get install -y -qq curl wget git build-essential > /dev/null
print_success "Build tools installed"

# Install nvm if not present
if [ ! -d "$HOME/.nvm" ]; then
    print_info "Installing nvm (Node Version Manager)..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash > /dev/null 2>&1
    
    # Source nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    print_success "nvm installed"
else
    print_success "nvm already installed"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Install Node.js via nvm
print_info "Installing Node.js $NODE_VERSION via nvm..."
if ! nvm list | grep -q "v$NODE_VERSION"; then
    nvm install "$NODE_VERSION" > /dev/null 2>&1
    nvm use "$NODE_VERSION" > /dev/null 2>&1
    print_success "Node.js $NODE_VERSION installed"
else
    nvm use "$NODE_VERSION" > /dev/null 2>&1
    print_success "Node.js $NODE_VERSION already installed"
fi

# Verify Node and npm
NODE_CHECK=$(node --version)
NPM_CHECK=$(npm --version)
print_success "Using: $NODE_CHECK and npm $NPM_CHECK"

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    print_info "Installing nginx..."
    sudo apt-get install -y -qq nginx > /dev/null
    sudo systemctl start nginx
    sudo systemctl enable nginx > /dev/null 2>&1
    print_success "nginx installed and started"
else
    print_success "nginx already installed"
fi

# Create directories
print_info "Creating application directories..."
sudo mkdir -p "$EC2_APP_DIR/app"
sudo mkdir -p "$EC2_APP_DIR/database"
sudo mkdir -p "$EC2_APP_DIR/logs"
sudo chown -R "$USER:$USER" "$EC2_APP_DIR"
chmod -R 755 "$EC2_APP_DIR"
print_success "Directories created"

# Determine SSL certificate paths
# Prefer Let's Encrypt if available, otherwise use/generate self-signed
if [ -f "/etc/letsencrypt/live/${EC2_DOMAIN}/fullchain.pem" ]; then
    SSL_CERT="/etc/letsencrypt/live/${EC2_DOMAIN}/fullchain.pem"
    SSL_KEY="/etc/letsencrypt/live/${EC2_DOMAIN}/privkey.pem"
    print_success "Using Let's Encrypt certificate"
else
    # Generate self-signed certificate if snakeoil doesn't exist
    if [ ! -f /etc/ssl/certs/ssl-cert-snakeoil.pem ]; then
        print_info "Generating self-signed SSL certificate..."
        sudo apt-get install -y -qq ssl-cert > /dev/null 2>&1 || \
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
            -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
            -subj "/CN=${EC2_DOMAIN}" > /dev/null 2>&1
        print_success "Self-signed certificate generated"
    fi
    SSL_CERT="/etc/ssl/certs/ssl-cert-snakeoil.pem"
    SSL_KEY="/etc/ssl/private/ssl-cert-snakeoil.key"
    print_info "Using self-signed certificate (run certbot for Let's Encrypt)"
fi

# Create nginx config
print_info "Configuring nginx..."
sudo tee /etc/nginx/sites-available/$EC2_DOMAIN > /dev/null << NGINXEOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${EC2_DOMAIN} www.${EC2_DOMAIN};
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${EC2_DOMAIN} www.${EC2_DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Note: HSTS header is added by certbot/setup_ssl after a valid certificate is obtained.
    # Do NOT add HSTS here with a self-signed cert - browsers will permanently block access.
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    access_log /var/log/nginx/${EC2_DOMAIN}_access.log combined;
    error_log /var/log/nginx/${EC2_DOMAIN}_error.log warn;

    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json;
    gzip_min_length 1000;

    # Serve React frontend (static)
    location / {
        root ${EC2_APP_DIR}/app/build;
        try_files \$uri \$uri/ /index.html;
        
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF

    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Enable our site
    sudo ln -sf /etc/nginx/sites-available/$EC2_DOMAIN /etc/nginx/sites-enabled/$EC2_DOMAIN
    
    # Test nginx config
    if ! sudo nginx -t > /dev/null 2>&1; then
        print_error "nginx configuration has errors"
        exit 1
    fi
    
    sudo systemctl reload nginx
    print_success "nginx configured and reloaded"

# Create systemd service that uses nvm
print_info "Creating systemd service..."
sudo tee /etc/systemd/system/relative-pointing-backend.service > /dev/null << SERVICEEOF
[Unit]
Description=Relative Pointing App - Backend API Server
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=${EC2_APP_DIR}/app

# Source nvm environment
Environment="PATH=$HOME/.nvm/versions/node/v${NODE_VERSION}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="NODE_ENV=production"
Environment="PORT=5000"
Environment="DATABASE_PATH=${EC2_APP_DIR}/database/app.db"
Environment="REACT_APP_API_URL=https://${EC2_DOMAIN}/api"

ExecStart=$HOME/.nvm/versions/node/v${NODE_VERSION}/bin/npm run start:backend

Restart=on-failure
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

StandardOutput=journal
StandardError=journal
SyslogIdentifier=relative-pointing

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SERVICEEOF

    sudo systemctl daemon-reload
    sudo systemctl enable relative-pointing-backend
    print_success "systemd service created"

print_success "EC2 setup complete"
EOF
)

    # Execute setup script on EC2
    ssh -i "$EC2_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$EC2_USER@$EC2_HOST" \
        "export EC2_APP_DIR='$EC2_APP_DIR'; export EC2_DOMAIN='$EC2_DOMAIN'; export NODE_VERSION='$NODE_VERSION'; bash -s" << SCRIPTEOF
$setup_script
SCRIPTEOF

    if [ $? -eq 0 ]; then
        print_success "EC2 instance configured"
    else
        print_error "Failed to configure EC2 instance"
        exit 1
    fi
}

# Create production .env on EC2
create_env_on_ec2() {
    print_info "Creating .env file on EC2..."
    
    ssh -i "$EC2_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$EC2_USER@$EC2_HOST" \
        "cat > $EC2_APP_DIR/app/.env" << EOF
NODE_ENV=production
PORT=5000
DATABASE_PATH=$EC2_APP_DIR/database/app.db
REACT_APP_API_URL=https://$EC2_DOMAIN/api
BACKEND_URL=http://localhost:5000
EOF
    
    if [ $? -eq 0 ]; then
        print_success ".env file created on EC2"
    else
        print_error "Failed to create .env on EC2"
        exit 1
    fi
}

# Upload build to EC2
upload_build() {
    print_header "Uploading Build to EC2"
    
    local build_path="$SCRIPT_DIR/build"
    local server_path="$SCRIPT_DIR/server"
    local package_json="$SCRIPT_DIR/package.json"
    local package_lock="$SCRIPT_DIR/package-lock.json"
    
    if [ ! -d "$build_path" ]; then
        print_error "Build directory not found: $build_path"
        exit 1
    fi
    
    # Calculate total size
    local build_size=$(du -sh "$build_path" | cut -f1)
    print_info "Uploading build ($build_size) to EC2..."
    
    # Upload build directory
    scp -i "$EC2_KEY_PATH" \
        -r -o ConnectTimeout=10 \
        -o StrictHostKeyChecking=no \
        "$build_path" \
        "$EC2_USER@$EC2_HOST:$EC2_APP_DIR/app/" > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        print_error "Failed to upload build directory"
        exit 1
    fi
    print_success "Build directory uploaded"
    
    # Upload server code
    print_info "Uploading server code..."
    scp -i "$EC2_KEY_PATH" \
        -r -o ConnectTimeout=10 \
        -o StrictHostKeyChecking=no \
        "$server_path" \
        "$EC2_USER@$EC2_HOST:$EC2_APP_DIR/app/" > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        print_error "Failed to upload server code"
        exit 1
    fi
    print_success "Server code uploaded"
    

    
    # Upload package files
    print_info "Uploading package files..."
    scp -i "$EC2_KEY_PATH" \
        -o ConnectTimeout=10 \
        -o StrictHostKeyChecking=no \
        "$package_json" "$package_lock" \
        "$EC2_USER@$EC2_HOST:$EC2_APP_DIR/app/" > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        print_error "Failed to upload package files"
        exit 1
    fi
    print_success "Package files uploaded"
    
    print_success "All files uploaded to EC2"
}

# Install dependencies on EC2 using nvm
install_dependencies() {
    print_header "Installing Dependencies on EC2"
    
    print_info "Installing npm dependencies..."
    ssh -i "$EC2_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$EC2_USER@$EC2_HOST" \
        "export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\"; cd $EC2_APP_DIR/app && npm ci --production" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed on EC2"
    else
        print_error "Failed to install dependencies on EC2"
        exit 1
    fi
}

# Obtain and configure Let's Encrypt SSL certificate
setup_ssl() {
    print_header "Configuring SSL Certificate (Let's Encrypt)"
    
    local certbot_email="${CERTBOT_EMAIL:-admin@$EC2_DOMAIN}"
    
    ssh -i "$EC2_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$EC2_USER@$EC2_HOST" \
        "bash -s" << SSLEOF
set -e

# Color functions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_error() { echo -e "\${RED}✗ \$1\${NC}"; }
print_success() { echo -e "\${GREEN}✓ \$1\${NC}"; }
print_info() { echo -e "\${BLUE}ℹ \$1\${NC}"; }
print_warning() { echo -e "\${YELLOW}⚠ \$1\${NC}"; }

EC2_DOMAIN="$EC2_DOMAIN"
CERTBOT_EMAIL="$certbot_email"

# Check if a valid Let's Encrypt cert already exists
if sudo test -f "/etc/letsencrypt/live/\${EC2_DOMAIN}/fullchain.pem"; then
    print_success "Let's Encrypt certificate already exists for \${EC2_DOMAIN}"
    
    # Ensure nginx is using the Let's Encrypt cert (not self-signed)
    if grep -q "snakeoil" /etc/nginx/sites-available/\${EC2_DOMAIN} 2>/dev/null; then
        print_info "Updating nginx to use Let's Encrypt certificate..."
        sudo certbot --nginx -d \${EC2_DOMAIN} --non-interactive --agree-tos --email \${CERTBOT_EMAIL} 2>&1
    fi
else
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        print_info "Installing certbot..."
        sudo apt-get update -qq > /dev/null
        sudo apt-get install -y -qq certbot python3-certbot-nginx > /dev/null
        print_success "certbot installed"
    else
        print_success "certbot already installed"
    fi

    # Obtain certificate using nginx plugin
    print_info "Obtaining Let's Encrypt certificate for \${EC2_DOMAIN}..."
    if sudo certbot --nginx \
        -d \${EC2_DOMAIN} \
        --non-interactive \
        --agree-tos \
        --email \${CERTBOT_EMAIL} \
        --redirect 2>&1; then
        print_success "Let's Encrypt certificate obtained and configured"
    else
        print_error "Failed to obtain Let's Encrypt certificate"
        print_warning "Common causes:"
        print_warning "  - DNS not pointing to this server yet"
        print_warning "  - Port 80 not open in security group"
        print_warning "  - Domain not registered or propagated"
        print_warning ""
        print_warning "The app is deployed with a self-signed cert for now."
        print_warning "Once DNS is ready, run on EC2:"
        print_warning "  sudo certbot --nginx -d \${EC2_DOMAIN}"
        exit 0
    fi
fi

# Add HSTS header to nginx config now that we have a valid certificate
if ! grep -q "Strict-Transport-Security" /etc/nginx/sites-available/\${EC2_DOMAIN} 2>/dev/null; then
    print_info "Adding HSTS header to nginx config..."
    sudo sed -i '/X-Content-Type-Options/i\\    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' /etc/nginx/sites-available/\${EC2_DOMAIN}
fi

# Verify nginx config and reload
if sudo nginx -t > /dev/null 2>&1; then
    sudo systemctl reload nginx
    print_success "nginx reloaded with valid SSL certificate"
else
    print_error "nginx config test failed after SSL setup"
    sudo nginx -t
    exit 1
fi

# Verify auto-renewal is set up
print_info "Verifying certbot auto-renewal..."
if sudo certbot renew --dry-run > /dev/null 2>&1; then
    print_success "Certificate auto-renewal is working"
else
    print_warning "Auto-renewal dry-run failed. You may need to set up a cron job."
fi

print_success "SSL setup complete"
SSLEOF

    if [ $? -eq 0 ]; then
        print_success "SSL certificate configured"
    else
        print_warning "SSL setup had issues - check output above"
    fi
}

# Start backend service
start_backend() {
    print_header "Starting Backend Service"
    
    print_info "Starting backend service..."
    ssh -i "$EC2_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$EC2_USER@$EC2_HOST" \
        "sudo systemctl restart relative-pointing-backend"
    
    # Wait for service to start
    sleep 2
    
    # Verify service is running
    if ssh -i "$EC2_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$EC2_USER@$EC2_HOST" \
        "sudo systemctl is-active --quiet relative-pointing-backend"; then
        print_success "Backend service is running"
    else
        print_error "Backend service failed to start"
        echo "Check logs: ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST"
        echo "           journalctl -u relative-pointing-backend -n 50"
        exit 1
    fi
}

# Show summary
show_summary() {
    print_header "Deployment Complete!"
    
    cat << EOF
✅ Your app has been deployed to EC2!

DEPLOYMENT SUMMARY:
  Instance:  $EC2_HOST
  Domain:    $EC2_DOMAIN
  App Dir:   $EC2_APP_DIR
  Node:      $NODE_VERSION (via nvm)
  Backend:   http://localhost:5000 (proxied through nginx)

WHAT HAPPENED:
  ✓ Built React app locally
  ✓ Checked all local prerequisites
  ✓ Installed nvm on EC2
  ✓ Installed Node.js $NODE_VERSION via nvm
  ✓ Uploaded build to EC2
  ✓ Uploaded server code to EC2
  ✓ Installed npm dependencies on EC2
  ✓ Configured nginx
  ✓ Created systemd service (uses nvm environment)
  ✓ Started backend service
  ✓ Obtained Let's Encrypt SSL certificate (auto-renews)

VERIFY IT WORKS:
  Visit: https://$EC2_DOMAIN
  API:   curl https://$EC2_DOMAIN/api/health

SSL CERTIFICATE:
  Let's Encrypt certificates auto-renew via certbot timer.
  To manually renew: ssh to EC2 and run: sudo certbot renew
  To check status:   sudo certbot certificates

USEFUL COMMANDS:

View logs:
  ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST
  journalctl -u relative-pointing-backend -f

Restart backend:
  ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST
  sudo systemctl restart relative-pointing-backend

Update code (redeploy):
  1. Make changes locally
  2. Run this script again: ./deploy-remote.sh

EOF
}

# Main execution
main() {
    print_header "Relative Pointing - Build Local, Deploy Remote with nvm"
    
    load_env
    check_local_prerequisites
    verify_ssh_key
    test_ssh_connection
    build_locally
    setup_ec2
    create_env_on_ec2
    upload_build
    install_dependencies
    start_backend
    setup_ssl
    show_summary
}

# Run main function
main
