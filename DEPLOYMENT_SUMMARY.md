# Deployment Documentation Summary

This document provides an overview of all deployment-related files for the Relative Pointing app.

## Files Created

### 1. **DEPLOYMENT.md** (17KB) - Comprehensive Deployment Guide
**Complete, detailed guide for deploying on EC2 with nginx and SSL**

This is the main deployment guide covering:
- Prerequisites and architecture overview
- 8-phase deployment process:
  - Phase 1: EC2 Instance Setup
  - Phase 2: Application Setup
  - Phase 3: Nginx Configuration
  - Phase 4: SSL Certificate (Let's Encrypt)
  - Phase 5: Process Management (Systemd)
  - Phase 6: Domain Configuration
  - Phase 7: Testing
  - Phase 8: Monitoring & Logging
- Database backups and maintenance
- Troubleshooting section with solutions
- Quick reference commands

**Start here if you want:** Deep understanding of each step and all configuration details

---

### 2. **EC2-QUICKSTART.md** (5.4KB) - Fast Track Setup
**Abbreviated guide for users who want to get running quickly**

This guide provides:
- Prerequisites checklist
- One-command automated setup (using deploy.sh)
- Quick verification steps
- Post-setup commands
- Troubleshooting for common issues
- Key paths and commands reference
- Architecture diagram

**Start here if you want:** Get running in minimal time with the automated script

---

### 3. **deploy.sh** (9.8KB) - Automated Deployment Script
**Executable bash script that automates the entire setup process**

This script:
- Installs Node.js, nginx, certbot, and dependencies
- Creates directory structure
- Clones/pulls your git repository
- Installs npm dependencies
- Builds React frontend
- Creates .env configuration
- Configures nginx reverse proxy
- Creates systemd service file

**Usage:**
```bash
chmod +x deploy.sh
sudo ./deploy.sh setup      # Initial setup
sudo ./deploy.sh update     # Update and rebuild
sudo ./deploy.sh restart    # Restart backend
./deploy.sh logs            # View logs
./deploy.sh status          # Check status
```

---

### 4. **nginx.conf.example** (5.1KB) - Nginx Configuration Template
**Ready-to-use nginx configuration file**

This file:
- Handles HTTP to HTTPS redirect
- Serves React frontend statically
- Proxies API requests to Node.js backend
- Configures SSL/TLS with security headers
- Sets up gzip compression
- Handles caching for assets and HTML

**Where to put it:**
```
/etc/nginx/sites-available/relativepointing.app
```

**Key features:**
- HTTP/2 support
- Security headers (HSTS, X-Content-Type-Options, etc.)
- Static asset caching (1 year)
- HTML cache busting (no-cache)
- API proxy with WebSocket support

---

### 5. **systemd-services.example** (6.0KB) - Service Configuration Template
**Systemd service files for process management**

Provides three options:
1. **Backend service only** (RECOMMENDED) - Just runs the Express backend
2. **Frontend build service** - Runs React build once on startup
3. **Combined service** - Alternative single service file

**Where to put them:**
```
/etc/systemd/system/relative-pointing-backend.service
/etc/systemd/system/relative-pointing-frontend.service (optional)
```

**Service management:**
```bash
sudo systemctl enable relative-pointing-backend
sudo systemctl start relative-pointing-backend
sudo systemctl status relative-pointing-backend
journalctl -u relative-pointing-backend -f
```

---

## Deployment Workflow

### Option A: Fully Automated (Recommended)
```bash
# On EC2 instance
1. Clone repository
2. Run: sudo ./deploy.sh setup
3. Configure DNS (point domain to EC2 IP)
4. Run: sudo certbot --nginx -d relativepointing.app
5. Start service: sudo systemctl start relative-pointing-backend
6. Done!
```

### Option B: Manual Setup
```bash
# On EC2 instance
1. Follow all steps in DEPLOYMENT.md phases 1-7
2. Manually copy nginx.conf.example to /etc/nginx/sites-available/
3. Manually copy systemd-services.example to /etc/systemd/system/
4. Manage using systemctl commands
```

---

## File Organization

After deployment, your EC2 will have:

```
/var/www/relative-pointing/
├── app/                              # Your cloned repository
│   ├── build/                        # React production build (served by nginx)
│   ├── server/                       # Express backend code
│   ├── src/                          # React source code
│   ├── public/                       # Static assets
│   ├── package.json                  # Dependencies
│   ├── .env                          # Configuration (not in git)
│   ├── .env.example                  # Example config
│   ├── deploy.sh                     # This deployment script
│   ├── DEPLOYMENT.md                 # Full deployment guide
│   └── EC2-QUICKSTART.md             # Quick start guide
├── database/                         # SQLite database directory
│   └── app.db                        # Your database file
└── logs/                             # Application logs

/etc/nginx/sites-available/
└── relativepointing.app              # Nginx configuration

/etc/systemd/system/
└── relative-pointing-backend.service # Systemd service file

/var/log/nginx/
├── relativepointing_access.log       # Access logs
└── relativepointing_error.log        # Error logs

/etc/letsencrypt/
└── live/relativepointing.app/        # SSL certificates (auto-renewed)
```

---

## Architecture After Deployment

```
┌─────────────────────────────────────────────┐
│          Users (HTTPS/443)                  │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   nginx             │
         │ (reverse proxy)     │
         └────────┬────────┬───┘
                  │        │
        ┌─────────▼─┐    ┌─┴──────────┐
        │ React App │    │ API Proxy  │
        │ (static)  │    │ (port 5000)│
        └───────────┘    └─────┬──────┘
                               │
                    ┌──────────▼────────┐
                    │ Node.js Backend   │
                    │ (Express API)     │
                    └──────────┬────────┘
                               │
                    ┌──────────▼────────┐
                    │ SQLite Database   │
                    │ (/database/app.db)│
                    └───────────────────┘
```

---

## Quick Reference

### Initial Setup
```bash
cd /var/www/relative-pointing/app
sudo ./deploy.sh setup
sudo certbot --nginx -d relativepointing.app
sudo systemctl start relative-pointing-backend
```

### Daily Operations
```bash
# View logs
journalctl -u relative-pointing-backend -f

# Restart backend
sudo systemctl restart relative-pointing-backend

# Update code
cd /var/www/relative-pointing/app
git pull origin main
npm ci --production
npm run build
sudo systemctl restart relative-pointing-backend

# Check health
curl https://relativepointing.app/api/health
```

### Troubleshooting
```bash
# Backend logs
journalctl -u relative-pointing-backend -n 50

# Nginx errors
sudo tail -f /var/log/nginx/relativepointing_error.log

# Service status
sudo systemctl status relative-pointing-backend

# Test nginx config
sudo nginx -t

# Check port usage
sudo lsof -i :5000
```

---

## What You Need Before Starting

1. **AWS EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.micro or larger
   - Security group with ports 22, 80, 443 open

2. **Domain Name**
   - Registered and accessible
   - Ability to edit DNS records

3. **Git Repository**
   - Cloned to /var/www/relative-pointing/app
   - Main branch ready to deploy

4. **SSH Access**
   - Key pair downloaded and protected
   - Can SSH to instance

---

## Next Steps After Deployment

1. **Monitor Application**
   - Set up CloudWatch alarms
   - Use Uptime Robot for availability monitoring

2. **Backup Strategy**
   - Automate database backups to S3
   - Set up EBS snapshots

3. **Scale Database**
   - Start with SQLite
   - Migrate to PostgreSQL when traffic increases

4. **CI/CD Pipeline**
   - GitHub Actions for automatic deployments
   - Run tests on every push
   - Auto-deploy on main branch updates

5. **Performance Optimization**
   - Monitor response times
   - Optimize database queries
   - Cache frequently accessed data

---

## Documentation Files Guide

| File | Purpose | Audience | Start Here If |
|------|---------|----------|---|
| **DEPLOYMENT.md** | Complete deployment guide | Technical users | You want full details |
| **EC2-QUICKSTART.md** | Fast setup guide | Everyone | You want to get running fast |
| **deploy.sh** | Automated setup script | All users | You want one-command setup |
| **nginx.conf.example** | Nginx configuration | Nginx admins | You're configuring manually |
| **systemd-services.example** | Service files | Linux admins | You're configuring manually |
| **README.md** | Project overview | Everyone | You're new to the project |
| **LOCAL_SETUP.md** | Local development setup | Developers | You're developing locally |

---

## Support Resources

- **Full Guide**: See DEPLOYMENT.md for complete step-by-step instructions
- **Quick Start**: See EC2-QUICKSTART.md for abbreviated version
- **Script Help**: Run `./deploy.sh` with no arguments for usage
- **Logs**: Use `journalctl -u relative-pointing-backend -f` to debug
- **Status**: Run `sudo systemctl status relative-pointing-backend`

---

## Common Commands

```bash
# Setup
sudo ./deploy.sh setup

# View logs
journalctl -u relative-pointing-backend -f
sudo tail -f /var/log/nginx/relativepointing_error.log

# Service management
sudo systemctl start|stop|restart relative-pointing-backend
sudo systemctl status relative-pointing-backend
sudo systemctl enable relative-pointing-backend

# Update application
cd /var/www/relative-pointing/app
git pull origin main
npm ci --production
npm run build
sudo systemctl restart relative-pointing-backend

# Health check
curl https://relativepointing.app/api/health
curl https://relativepointing.app/

# Database
ls -lah /var/www/relative-pointing/database/
du -sh /var/www/relative-pointing/database/app.db
```

---

**Remember**: The `deploy.sh` script automates most of this. If you're in a hurry, start with EC2-QUICKSTART.md!
