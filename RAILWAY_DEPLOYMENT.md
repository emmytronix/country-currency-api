# Railway Deployment Guide

Complete step-by-step guide to deploy your Country Currency API on Railway.

## Prerequisites

- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- Git installed locally
- Your code pushed to GitHub

---

## Step 1: Prepare Your Repository

### 1.1 Verify Required Files

Ensure your repository has these files:
```
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── cache/ (will be auto-created)
```

### 1.2 Commit and Push to GitHub

```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

---

## Step 2: Set Up Railway Project

### 2.1 Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Login" → Sign in with GitHub
3. Authorize Railway to access your repositories

### 2.2 Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository from the list
4. Railway will automatically detect it's a Node.js project

### 2.3 Initial Deployment

Railway will:
- Detect `package.json`
- Run `npm install`
- Start your app with `npm start`

**Note:** The app will fail at this point because MySQL isn't set up yet. That's expected!

---

## Step 3: Add MySQL Database

### 3.1 Add MySQL Service

1. In your Railway project dashboard, click **"New"**
2. Select **"Database"**
3. Choose **"Add MySQL"**
4. Railway will provision a MySQL instance

### 3.2 Verify MySQL Variables

Railway automatically creates these environment variables:
- `MYSQLHOST`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLDATABASE`
- `MYSQLPORT`

These are automatically shared with your application service.

### 3.3 Connect Services

1. Click on your application service
2. Go to **"Variables"** tab
3. Verify MySQL variables appear in the "Shared Variables" section
4. If not, click **"Connect"** and link the MySQL service

---

## Step 4: Configure Application

### 4.1 Set Custom Variables (Optional)

If you need custom PORT or other variables:

1. Click on your application service
2. Go to **"Variables"** tab
3. Click **"New Variable"**
4. Add any custom variables (usually not needed)

### 4.2 Verify Environment

The app should automatically use Railway's MySQL variables from the code:
```javascript
host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'countries_db',
port: process.env.MYSQLPORT || 3306,
```

---

## Step 5: Deploy and Generate Domain

### 5.1 Generate Public URL

1. Click on your application service
2. Go to **"Settings"** tab
3. Scroll to **"Networking"** section
4. Click **"Generate Domain"**
5. You'll get a URL like: `https://your-app-production.up.railway.app`

### 5.2 Wait for Deployment

- Check the **"Deployments"** tab
- Wait for status to show **"Success"**
- Click "View Logs" to see startup messages

---

## Step 6: Initialize Your API

### 6.1 Test Health Endpoint

```bash
curl https://your-app-production.up.railway.app/
```

Expected response:
```json
{
  "message": "Country Currency & Exchange API",
  "version": "1.0.0",
  "status": "running"
}
```

### 6.2 Refresh Country Data

```bash
curl -X POST https://your-app-production.up.railway.app/countries/refresh
```

This will:
- Fetch all countries from REST Countries API
- Get exchange rates
- Calculate GDPs
- Store in database
- Generate summary image

**Note:** This may take 30-60 seconds.

### 6.3 Verify Data

```bash
# Check status
curl https://your-app-production.up.railway.app/status

# Get countries
curl https://your-app-production.up.railway.app/countries

# Get image
curl https://your-app-production.up.railway.app/countries/image --output summary.png
```

---

## Step 7: Monitoring and Logs

### 7.1 View Logs

1. Click on your service
2. Go to **"Deployments"** tab
3. Click on latest deployment
4. View real-time logs

### 7.2 Check Metrics

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request metrics

### 7.3 Set Up Alerts (Optional)

1. Go to project settings
2. Configure webhook notifications
3. Get alerted on deployment failures

---

## Troubleshooting

### Issue: App Crashes on Startup

**Symptom:** Deployment shows "Crashed" status

**Solutions:**
1. Check logs for error messages
2. Verify MySQL service is running
3. Ensure MySQL variables are connected
4. Check if `package.json` has correct start script

```bash
# View logs in Railway dashboard or CLI
railway logs
```

### Issue: Cannot Connect to Database

**Symptom:** "ECONNREFUSED" or "Access denied" errors

**Solutions:**
1. Verify MySQL service is running (green status)
2. Check that services are linked
3. Restart both services
4. Verify connection pool configuration

### Issue: External API Timeouts

**Symptom:** `/countries/refresh` returns 503 error

**Solutions:**
1. Check if REST Countries API is accessible
2. Check if Exchange Rates API is accessible
3. Try again after a few minutes (APIs might be rate limiting)
4. Check Railway's egress settings

### Issue: Image Generation Fails

**Symptom:** `/countries/image` returns 404

**Solutions:**
1. Check logs for canvas/image errors
2. Ensure node-canvas dependencies are installed
3. Railway should handle canvas dependencies automatically
4. Try running refresh again

### Issue: Out of Memory

**Symptom:** App crashes with "JavaScript heap out of memory"

**Solutions:**
1. Upgrade your Railway plan for more memory
2. Optimize data processing in batches
3. Add pagination to `/countries` endpoint

---

## Railway CLI (Optional)

### Install Railway CLI

```bash
npm install -g @railway/cli
```

### Login

```bash
railway login
```

### Link Project

```bash
railway link
```

### View Logs Locally

```bash
railway logs
```

### Run Commands

```bash
# Connect to MySQL
railway run mysql -u root -p

# Run local with Railway variables
railway run npm start
```

---

## Cost Management

### Free Tier Limits

Railway's free tier (Hobby plan) includes:
- $5 free credit per month
- No credit card required
- Suitable for small projects and testing

### Pricing

After free credits:
- **Usage-based pricing**
- Pay only for what you use
- Typical small API: $1-5/month

### Monitor Usage

1. Go to project dashboard
2. Click "Usage" tab
3. View current month's usage
4. Set up spending limits

---

## Production Checklist

Before going live, ensure:

- [ ] Code is pushed to GitHub
- [ ] MySQL database is connected
- [ ] Environment variables are set
- [ ] Domain is generated
- [ ] `/countries/refresh` executed successfully
- [ ] All endpoints tested
- [ ] Logs show no errors
- [ ] Summary image generated
- [ ] README has correct deployment URL
- [ ] API documentation updated with production URL

---

## Automatic Deployments

Railway automatically deploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Railway automatically:
# 1. Detects the push
# 2. Builds new image
# 3. Runs tests (if configured)
# 4. Deploys new version
# 5. Zero-downtime deployment
```

---

## Scaling Considerations

### Horizontal Scaling

Railway supports horizontal scaling:
1. Go to service settings
2. Adjust replica count
3. Railway handles load balancing

### Database Scaling

For high traffic:
1. Upgrade MySQL plan
2. Add read replicas
3. Implement caching layer (Redis)

### Performance Tips

1. **Add indexes** to frequently queried columns
2. **Implement caching** for `/countries` endpoint
3. **Add rate limiting** to prevent abuse
4. **Use CDN** for static assets (images)
5. **Monitor slow queries** in MySQL logs

---

## Backup and Recovery

### Database Backups

Railway automatically backs up MySQL:
- Daily snapshots
- 7-day retention (default)
- Can restore from dashboard

### Manual Backup

```bash
# Export database
railway run mysqldump -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE > backup.sql

# Import database
railway run mysql -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE < backup.sql
```

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to service settings
2. Scroll to "Networking"
3. Click "Custom Domain"
4. Enter your domain (e.g., `api.yourdomain.com`)
5. Add CNAME record to your DNS:
   ```
   CNAME api.yourdomain.com -> your-app.up.railway.app
   ```
6. Wait for DNS propagation (5-30 minutes)

---

## Support Resources

- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **Railway Discord:** [discord.gg/railway](https://discord.gg/railway)
- **Railway Status:** [status.railway.app](https://status.railway.app)
- **Railway Blog:** [blog.railway.app](https://blog.railway.app)

---

## Quick Reference

### Important URLs

```bash
# Dashboard
https://railway.app/dashboard

# Your Project
https://railway.app/project/[PROJECT_ID]

# Your API
https://your-app-production.up.railway.app

# MySQL URL (internal)
mysql://$MYSQLUSER:$MYSQLPASSWORD@$MYSQLHOST:$MYSQLPORT/$MYSQLDATABASE
```

### Common Commands

```bash
# View logs
railway logs

# Open service
railway open

# Run command with Railway env
railway run [command]

# Deploy manually
git push origin main
```

---

## Next Steps

After successful deployment:

1. **Test all endpoints** thoroughly
2. **Set up monitoring** (UptimeRobot, StatusCake)
3. **Document your API** with production URLs
4. **Share with your team**
5. **Set up CI/CD** (optional)
6. **Monitor costs** regularly
7. **Plan scaling strategy** for growth

---

## Congratulations! 🎉

Your Country Currency API is now live on Railway!