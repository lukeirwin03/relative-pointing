# Deploy in 5 Minutes - Build Local, Deploy Remote

Build React app on your machine, upload to EC2, start the app. Super simple!

## What You Need

- ✅ AWS EC2 instance running (Ubuntu 22.04)
- ✅ EC2 SSH key (your .pem file)
- ✅ EC2 public IP address
- ✅ Your domain name (relativepointing.app)
- ✅ Node.js 18+ installed locally (for building)

## The 3 Steps

### Step 1: Configure Your .env File (1 minute)

```bash
cp .env.example .env
nano .env
```

Fill in these fields:
```env
EC2_HOST=your-ec2-public-ip              # e.g., 3.14.159.26
EC2_USER=ubuntu                          # Default for Ubuntu AMIs
EC2_KEY_PATH=~/.ssh/your-ec2-key.pem    # Path to your SSH key
EC2_DOMAIN=relativepointing.app          # Your domain
AWS_REGION=us-east-1                     # AWS region (us-east-1, us-west-2, etc.)
EC2_APP_DIR=/var/www/relative-pointing   # Deployment directory on EC2
```

Save and exit (Ctrl+X, Y, Enter).

### Step 2: Run Deployment Script (2-3 minutes)

```bash
chmod +x deploy-remote.sh
./deploy-remote.sh
```

The script automatically:
1. ✅ Builds React app on your machine
2. ✅ Uploads `build/` directory to EC2
3. ✅ Uploads `server/` code to EC2
4. ✅ Uploads `package.json` and `package-lock.json`
5. ✅ Installs production dependencies on EC2
6. ✅ Configures nginx on EC2
7. ✅ Creates systemd service for auto-restart
8. ✅ Starts your backend
8. ✅ Shows you what's next

### Step 3: Set Up SSL Certificate (5 minutes)

After the script completes, set up AWS ACM:

1. Go to AWS Console → **Certificate Manager**
2. Click **Request a Certificate**
3. Enter domain: `relativepointing.app`
4. Choose **DNS validation**
5. Add DNS records to your domain registrar
6. Wait for validation (usually instant)
7. Download certificate from ACM console
8. Upload to EC2:
   ```bash
   scp -i ~/.ssh/your-key.pem certificate.pem ubuntu@your-ec2-ip:/tmp/
   scp -i ~/.ssh/your-key.pem private-key.pem ubuntu@your-ec2-ip:/tmp/
   ```
9. SSH to EC2 and update nginx config:
   ```bash
   ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
   sudo mkdir -p /etc/ssl/acm
   sudo mv /tmp/certificate.pem /etc/ssl/acm/
   sudo mv /tmp/private-key.pem /etc/ssl/acm/
   ```
10. Update nginx:
    ```bash
    sudo nano /etc/nginx/sites-available/relativepointing.app
    # Replace certificate paths with /etc/ssl/acm/certificate.pem
    sudo nginx -t && sudo systemctl reload nginx
    ```

That's it! Your app is live on HTTPS! 🎉

## How It Works

### Build Locally
- Your machine: Builds React app with `npm run build`
- Creates optimized production bundle (~3-5MB)
- Done in ~30 seconds

### Upload to EC2
- Uses `scp` to securely copy files to EC2
- Uploads `build/` directory (your React app)
- Uploads `server/` directory (your backend code)
- Uploads `package.json` and `package-lock.json`

### Install & Run on EC2
- Installs npm dependencies: `npm ci --production`
- Creates systemd service for auto-restart
- Starts backend on port 5000
- nginx proxies requests to backend

### Result
- Fast builds locally (no waiting on EC2)
- Reliable deployment via standard tools (git, npm, scp)
- Easy to redeploy (just run script again)
- Automatic restart on crashes

## Troubleshooting

### Build fails locally
```bash
# Check Node version
node --version  # Should be 18+

# Check package.json exists
ls package.json

# Try manually
npm ci
npm run build
```

### Upload fails
```bash
# Check SSH key
ls ~/.ssh/your-key.pem

# Test SSH manually
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Check EC2 disk space
df -h
```

### Backend won't start
```bash
# SSH to EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Check logs
journalctl -u relative-pointing-backend -f

# Check if port 5000 is in use
sudo lsof -i :5000
```

## Redeployment

To redeploy after making code changes:

```bash
# Just run the script again
./deploy-remote.sh
```

The script will:
1. Rebuild React locally
2. Upload new build files to EC2
3. Restart the backend service
4. Done!

## Commands Cheat Sheet

```bash
# Deploy
./deploy-remote.sh

# View logs
ssh -i ~/.ssh/KEY.pem ubuntu@IP journalctl -u relative-pointing-backend -f

# Restart backend
ssh -i ~/.ssh/KEY.pem ubuntu@IP sudo systemctl restart relative-pointing-backend

# SSH to EC2
ssh -i ~/.ssh/KEY.pem ubuntu@IP

# Check health
curl http://EC2_IP:5000/api/health
```

## What Gets Deployed

```
Your Machine              EC2 Instance
├─ npm run build          /var/www/relative-pointing/app/
├─ build/                 ├─ build/ (React static files)
├─ server/                ├─ server/ (Node.js code)
└─ package*.json          └─ node_modules/ (dependencies)
      ↓ (scp)                  ↓
   Upload             systemd service running
                      Backend on port 5000
                      nginx serving on port 80/443
```

## Performance

- **Build time:** ~30-60 seconds (locally)
- **Upload time:** ~10-20 seconds (depends on internet)
- **Setup time:** ~30 seconds (EC2)
- **Total:** ~2-3 minutes for full deployment

## For Full Details

See `AWS-ACM-DEPLOYMENT.md` for complete SSL setup guide.

---

That's all you need! Build locally, deploy to EC2, done! 🚀
