# AWS ACM + EC2 Deployment Guide

This guide shows how to deploy Relative Pointing to EC2 using AWS Certificate Manager (ACM) for SSL/TLS.

## Quick Start (3 Simple Steps)

### Step 1: Configure Your Local .env File

Copy `.env.example` to `.env` and fill in your EC2 details:

```bash
cp .env.example .env
```

Edit `.env` with your information:

```env
# EC2 SSH Configuration
EC2_HOST=your-ec2-public-ip-or-dns
EC2_USER=ubuntu
EC2_KEY_PATH=~/.ssh/your-ec2-key.pem
EC2_DOMAIN=relativepointing.app

# AWS Region (where you'll request ACM certificate)
AWS_REGION=us-east-1

# Deployment Directory on EC2
EC2_APP_DIR=/var/www/relative-pointing

# GitHub Repository
GITHUB_REPO=https://github.com/your-username/relative-pointing.git
GITHUB_BRANCH=main
```

### Step 2: Run the Deployment Script

```bash
# Make sure the script is executable
chmod +x deploy-remote.sh

# Run deployment (this does EVERYTHING remotely)
./deploy-remote.sh
```

The script will:
- ✅ Verify your SSH key
- ✅ Test EC2 connection
- ✅ Install Node.js, nginx, git
- ✅ Clone your repository
- ✅ Install npm dependencies
- ✅ Build React production bundle
- ✅ Configure nginx
- ✅ Create systemd service
- ✅ Start your backend

**That's it!** No manual SSH commands needed. Everything is automated.

### Step 3: Set Up AWS ACM Certificate

Now that your app is running, you need to add SSL/TLS.

#### 3a: Request Certificate in AWS ACM

1. Go to AWS Console → **Certificate Manager (ACM)**
2. Click **Request a Certificate**
3. Enter domain name: `relativepointing.app`
4. Add additional domain: `*.relativepointing.app` (wildcard)
5. Choose validation method: **DNS validation** (recommended)
6. Click **Request**
7. AWS will show you DNS records to add

#### 3b: Validate Domain Ownership

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add the DNS records that AWS shows you
3. Wait for validation (usually a few minutes)
4. Check AWS console - it will show "Issued" when complete

#### 3c: Configure nginx with ACM Certificate

Once your certificate is issued:

1. SSH to your EC2 instance:
   ```bash
   ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
   ```

2. Download certificate files from ACM:
   - In AWS console, click the certificate name
   - Click **Export certificate**
   - Download all files

3. Upload to EC2:
   ```bash
   scp -i ~/.ssh/your-key.pem Certificate.pem ubuntu@your-ec2-ip:/tmp/
   scp -i ~/.ssh/your-key.pem PrivateKey.pem ubuntu@your-ec2-ip:/tmp/
   scp -i ~/.ssh/your-key.pem CertificateChain.pem ubuntu@your-ec2-ip:/tmp/
   ```

4. On EC2, create certificate directory:
   ```bash
   sudo mkdir -p /etc/ssl/acm
   sudo mv /tmp/Certificate.pem /etc/ssl/acm/certificate.pem
   sudo mv /tmp/PrivateKey.pem /etc/ssl/acm/private-key.pem
   sudo mv /tmp/CertificateChain.pem /etc/ssl/acm/chain.pem
   sudo chown root:root /etc/ssl/acm/*
   sudo chmod 600 /etc/ssl/acm/private-key.pem
   ```

5. Update nginx configuration:
   ```bash
   sudo nano /etc/nginx/sites-available/relativepointing.app
   ```

   Replace these lines:
   ```nginx
   ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
   ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
   ```

   With these:
   ```nginx
   ssl_certificate /etc/ssl/acm/certificate.pem;
   ssl_certificate_key /etc/ssl/acm/private-key.pem;
   ssl_trusted_certificate /etc/ssl/acm/chain.pem;
   ```

6. Test and reload nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

#### 3d: Configure DNS

In your domain registrar, point your domain to the EC2 instance:

1. Add A record:
   - **Name:** `@` (or leave blank)
   - **Type:** A
   - **Value:** Your EC2 public IP address
   - **TTL:** 3600

2. Add www subdomain (optional):
   - **Name:** `www`
   - **Type:** A
   - **Value:** Your EC2 public IP address

Wait 5-30 minutes for DNS propagation.

#### 3e: Verify It Works

```bash
# Test API
curl https://relativepointing.app/api/health

# Visit in browser
# https://relativepointing.app
```

## Architecture with AWS ACM

```
Users (HTTPS on 443)
        ↓
    AWS ACM Certificate
        ↓
nginx (reverse proxy)
    ├─ / → React static build
    └─ /api/* → Express backend (port 5000)
                    ↓
              SQLite Database
```

## Troubleshooting

### SSH Connection Failed
```bash
# Check SSH key permissions
chmod 600 ~/.ssh/your-key.pem

# Test connection manually
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Verify security group allows port 22
# In AWS Console → EC2 → Security Groups → Edit Inbound Rules
```

### Deployment Script Failed
```bash
# Verify .env file is correct
cat .env

# Check SSH key path exists
ls ~/.ssh/your-key.pem

# Try SSH manually to see actual error
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
```

### Certificate Won't Load in nginx
```bash
# Check certificate files exist
sudo ls -la /etc/ssl/acm/

# Check certificate is valid
sudo openssl x509 -in /etc/ssl/acm/certificate.pem -text -noout

# Check nginx syntax
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/relativepointing_error.log
```

### HTTPS Still Shows Self-Signed Certificate
```bash
# Clear browser cache (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
# Check nginx is using correct certificate path
sudo grep ssl_certificate /etc/nginx/sites-available/relativepointing.app
# Verify certificate files exist at those paths
sudo ls -la /etc/ssl/acm/
```

## Maintenance

### Check Certificate Expiration
In AWS Console → Certificate Manager, you'll see the expiration date. You'll need to renew before it expires.

### View Logs
```bash
# Backend logs
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
journalctl -u relative-pointing-backend -f

# Nginx error logs
sudo tail -f /var/log/nginx/relativepointing_error.log
```

### Update Code
```bash
# SSH to instance
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Pull latest code
cd /var/www/relative-pointing/app
git pull origin main
npm ci --production
npm run build

# Restart backend
sudo systemctl restart relative-pointing-backend
```

### Restart Services
```bash
# SSH to instance
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Restart backend
sudo systemctl restart relative-pointing-backend

# Restart nginx
sudo systemctl reload nginx
```

## Advanced: AWS Application Load Balancer (ALB)

For production with higher traffic, use AWS ALB which integrates with ACM automatically:

1. Create ALB in AWS Console
2. Attach ACM certificate to ALB
3. Point to EC2 instance on port 5000
4. Let ALB handle SSL/TLS termination
5. EC2 can run HTTP only (more efficient)

This is the recommended setup for production.

## Useful Commands

```bash
# SSH to EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Check backend status
sudo systemctl status relative-pointing-backend

# View backend logs
journalctl -u relative-pointing-backend -f

# Restart backend
sudo systemctl restart relative-pointing-backend

# Check nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/relativepointing_error.log

# Check disk space
df -h

# Check database
ls -lah /var/www/relative-pointing/database/app.db
```

## Summary

Your deployment process:

1. **Local machine:** Edit `.env` with EC2 details
2. **Local machine:** Run `./deploy-remote.sh` (fully automated)
3. **AWS console:** Request ACM certificate
4. **AWS console:** Validate domain via DNS
5. **EC2:** Update nginx with certificate files
6. **Domain registrar:** Point A record to EC2 IP
7. **Done:** Your app is live on HTTPS!

No manual SSH commands needed except for certificate setup. Everything else is automated!
