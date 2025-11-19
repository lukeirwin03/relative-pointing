# Deployment Guide - AWS S3 + CloudFront

## Overview

Deploy the React app as a static site to AWS S3 with CloudFront for HTTPS and performance.

## Prerequisites

- AWS Account
- AWS CLI installed and configured
- Node.js and npm
- Built React app (`npm run build`)

## Step 1: Install AWS CLI

```bash
# macOS
brew install awscli

# Windows
# Download from: https://aws.amazon.com/cli/

# Linux
sudo apt-get install awscli
```

Configure AWS CLI:
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, Region, Output format
```

## Step 2: Create S3 Bucket

```bash
# Choose a unique bucket name
BUCKET_NAME="relative-pointing-app"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html
```

## Step 3: Configure Bucket Policy

Create `bucket-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::relative-pointing-app/*"
    }
  ]
}
```

Apply policy:
```bash
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
```

## Step 4: Build React App

```bash
npm run build
```

This creates a `build/` directory with optimized static files.

## Step 5: Deploy to S3

```bash
# Sync build folder to S3
aws s3 sync build/ s3://$BUCKET_NAME --delete

# Set cache headers for static assets
aws s3 cp s3://$BUCKET_NAME/static s3://$BUCKET_NAME/static \
  --recursive \
  --metadata-directive REPLACE \
  --cache-control max-age=31536000,public
```

Your app is now live at:
```
http://relative-pointing-app.s3-website-us-east-1.amazonaws.com
```

## Step 6: Set Up CloudFront (for HTTPS)

### Create CloudFront Distribution

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. Click "Create Distribution"
3. Configure:
   - **Origin Domain**: Select your S3 bucket website endpoint (NOT the bucket itself)
   - **Origin Path**: Leave empty
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP Methods**: GET, HEAD, OPTIONS
   - **Cache Policy**: CachingOptimized
   - **Price Class**: Use all edge locations (or choose based on budget)
   - **Alternate Domain Names**: (optional, for custom domain)
   - **SSL Certificate**: Default CloudFront certificate (or custom)
4. Click "Create Distribution"

Wait 15-20 minutes for deployment.

### Update CloudFront for SPA Routing

To handle React Router:

1. Go to your distribution
2. Click "Error Pages" tab
3. Create custom error response:
   - **HTTP Error Code**: 403 Forbidden
   - **Customize Error Response**: Yes
   - **Response Page Path**: /index.html
   - **HTTP Response Code**: 200 OK
4. Repeat for 404 Not Found

## Step 7: Custom Domain (Optional)

### Using Route 53

1. Register or transfer domain to Route 53
2. Request ACM certificate:
   ```bash
   aws acm request-certificate \
     --domain-name pointing.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```
3. Add validation CNAME to Route 53
4. Update CloudFront:
   - Add alternate domain name
   - Select ACM certificate
5. Create Route 53 A record:
   - Type: A
   - Alias: Yes
   - Target: CloudFront distribution

## Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash

BUCKET_NAME="relative-pointing-app"
DISTRIBUTION_ID="YOUR_CLOUDFRONT_ID"

echo "Building app..."
npm run build

echo "Deploying to S3..."
aws s3 sync build/ s3://$BUCKET_NAME --delete

echo "Setting cache headers..."
aws s3 cp s3://$BUCKET_NAME/static s3://$BUCKET_NAME/static \
  --recursive \
  --metadata-directive REPLACE \
  --cache-control max-age=31536000,public \
  --acl public-read

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "Deployment complete!"
echo "URL: https://YOUR_DOMAIN or https://CLOUDFRONT_URL"
```

Make executable:
```bash
chmod +x deploy.sh
```

## Environment Variables

For production, create `.env.production`:

```bash
REACT_APP_FIREBASE_API_KEY=your_prod_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

These are automatically used during `npm run build`.

## Cost Estimate

### Free Tier (First 12 Months)
- **S3**: 5 GB storage, 20K GET requests, 2K PUT requests
- **CloudFront**: 1 TB transfer, 10M HTTP/HTTPS requests
- **Route 53**: $0.50/month per hosted zone (not free)

### After Free Tier
- **S3**: ~$0.023/GB storage, $0.0004/1K requests
- **CloudFront**: ~$0.085/GB transfer
- **Estimated monthly cost for small app**: $1-5

## CI/CD Setup (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to S3

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
      env:
        REACT_APP_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
        REACT_APP_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
        REACT_APP_FIREBASE_DATABASE_URL: ${{ secrets.FIREBASE_DATABASE_URL }}
        REACT_APP_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
        REACT_APP_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
        REACT_APP_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
        REACT_APP_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
    
    - name: Deploy to S3
      uses: jakejarvis/s3-sync-action@master
      with:
        args: --delete
      env:
        AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        AWS_REGION: 'us-east-1'
        SOURCE_DIR: 'build'
    
    - name: Invalidate CloudFront
      uses: chetan/invalidate-cloudfront-action@v2
      env:
        DISTRIBUTION: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
        PATHS: '/*'
        AWS_REGION: 'us-east-1'
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

Add secrets to GitHub repository settings.

## Monitoring

### CloudWatch Metrics
- S3 bucket metrics
- CloudFront request count
- Error rates

### CloudFront Reports
- Popular objects
- Viewers
- Cache statistics

## Troubleshooting

### 403 Forbidden
- Check bucket policy
- Verify files are public
- Check CloudFront error pages configuration

### Blank page / 404 on refresh
- Ensure CloudFront error pages redirect to index.html
- Check React Router is using BrowserRouter

### Changes not appearing
- CloudFront caches content
- Create invalidation for `/*`
- Wait 5-10 minutes for propagation

### CORS errors
- Add CORS configuration to S3 bucket
- CloudFront should pass through CORS headers

## Rollback

To rollback to previous version:

```bash
# List previous versions (if versioning enabled)
aws s3api list-object-versions --bucket $BUCKET_NAME

# Restore from backup
aws s3 sync s3://backup-bucket/ s3://$BUCKET_NAME/

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

## Security Checklist

- ✅ HTTPS enabled via CloudFront
- ✅ S3 bucket not publicly listable
- ✅ Environment variables not committed to git
- ✅ Firebase security rules properly configured
- ✅ CloudFront using secure viewer protocols
- ✅ No sensitive data in client-side code

## Next Steps

1. Test deployment with staging environment
2. Set up monitoring and alerts
3. Configure backup strategy
4. Document runbook for common issues
5. Train team on deployment process
