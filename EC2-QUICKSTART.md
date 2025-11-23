# EC2 Quick Start - Relative Pointing App

This guide gets your Relative Pointing app running on EC2 in the shortest time possible.

## Prerequisites Checklist

- [ ] AWS EC2 instance running Ubuntu 22.04 LTS
- [ ] SSH key pair downloaded
- [ ] Security group allows ports 22, 80, 443
- [ ] Domain registered (relativepointing.app)
- [ ] Git repository URL ready

## One-Command Setup (Automated)

### Step 1: SSH into Your Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Step 2: Clone Your Repository

```bash
# Clone to your home directory temporarily
git clone https://github.com/your-username/relative-pointing.git
cd relative-pointing
```

### Step 3: Run Deployment Script

```bash
# Make script executable
chmod +x deploy.sh

# Run setup (installs everything)
sudo ./deploy.sh setup
```

That's it! The script will:
- Install Node.js, nginx, certbot
- Create directories and config files
- Build the React frontend
- Create systemd service
- Configure nginx

## Manual Verification Steps

### Step 4: Configure DNS

In your domain registrar:
1. Add A record pointing to your EC2 public IP
2. Wait 5-30 minutes for DNS propagation
3. Test: `nslookup relativepointing.app`

### Step 5: Get SSL Certificate

```bash
# After DNS is set up
sudo certbot --nginx -d relativepointing.app

# Follow prompts and select option to redirect HTTP to HTTPS
```

### Step 6: Start the Backend

```bash
sudo systemctl start relative-pointing-backend
sudo systemctl status relative-pointing-backend
```

### Step 7: Test It Works

```bash
# Test API
curl https://relativepointing.app/api/health

# Should return: {"status":"ok"}

# Test frontend - visit in browser
# https://relativepointing.app
```

## After Initial Setup

### View Logs
```bash
# Follow logs in real-time
journalctl -u relative-pointing-backend -f

# View last 50 lines
journalctl -u relative-pointing-backend -n 50
```

### Update Application
```bash
cd /var/www/relative-pointing/app
sudo ./deploy.sh update

# Or do it manually:
sudo su
cd /var/www/relative-pointing/app
git pull origin main
npm ci --production
npm run build
systemctl restart relative-pointing-backend
```

### Restart Service
```bash
sudo systemctl restart relative-pointing-backend
sudo systemctl status relative-pointing-backend
```

### Check nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t  # Test config
sudo systemctl reload nginx
```

## Troubleshooting

### DNS Not Working
```bash
# Force refresh DNS
sudo systemctl restart systemd-resolved

# Check DNS
dig relativepointing.app
nslookup relativepointing.app
```

### Backend Won't Start
```bash
# Check logs
journalctl -u relative-pointing-backend -n 50

# Manual test
cd /var/www/relative-pointing/app
npm run start:backend

# Kill if stuck
sudo lsof -i :5000
sudo kill -9 <PID>
```

### nginx Not Serving
```bash
# Test config
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/relativepointing_error.log

# Restart
sudo systemctl restart nginx
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

## Key Paths

```
/var/www/relative-pointing/
├── app/                          # Your application
│   ├── build/                    # React production build
│   ├── server/                   # Express backend
│   ├── src/                      # React source
│   ├── .env                      # Environment variables
│   └── package.json
├── database/                     # SQLite database
│   └── app.db
└── logs/                         # Application logs
```

## Key Commands

```bash
# Service management
sudo systemctl start relative-pointing-backend
sudo systemctl stop relative-pointing-backend
sudo systemctl restart relative-pointing-backend
sudo systemctl status relative-pointing-backend
sudo systemctl enable relative-pointing-backend

# Logs
journalctl -u relative-pointing-backend -f
sudo tail -f /var/log/nginx/relativepointing_error.log

# Update
cd /var/www/relative-pointing/app && git pull origin main && npm ci --production && npm run build && sudo systemctl restart relative-pointing-backend

# Health check
curl https://relativepointing.app/api/health
curl https://relativepointing.app/
```

## What Gets Deployed

- **Frontend**: React app built statically and served by nginx
- **Backend**: Express.js API running on port 5000 (proxied through nginx)
- **Database**: SQLite at `/var/www/relative-pointing/database/app.db`
- **SSL**: Let's Encrypt certificate auto-renewed by certbot

## Architecture

```
User → HTTPS (nginx on 443) → /app/build (static React)
                          \→ /api → Express (port 5000) → SQLite DB
```

## Security Notes

- Only ports 22, 80, 443 open (configure in AWS Security Groups)
- HTTPS/SSL enforced on all connections
- Environment variables in `.env` (excluded from git)
- Database file permissions restricted
- nginx runs as www-data, backend runs as ubuntu

## Next Steps

1. **Monitor**: Set up CloudWatch alarms or Uptime Robot
2. **Backup**: Automate database backups to S3
3. **Scale**: Migrate from SQLite to PostgreSQL if needed
4. **CI/CD**: Set up GitHub Actions for automatic deployments
5. **Analytics**: Add session tracking and usage metrics

## Support

For detailed setup info, see `DEPLOYMENT.md`
For architecture details, see `README.md`
