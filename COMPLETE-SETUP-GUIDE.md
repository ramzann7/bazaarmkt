# 🚀 Complete bazaarMKT CI/CD Setup Guide for Beginners

This guide will walk you through setting up a complete CI/CD pipeline for bazaarMKT from scratch, even if you've never used Vercel or Docker before.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Missing Configuration Files](#step-1-create-missing-configuration-files)
3. [Step 2: Set Up Environment Variables](#step-2-set-up-environment-variables)
4. [Step 3: Deploy Frontend to Vercel](#step-3-deploy-frontend-to-vercel)
5. [Step 4: Deploy Backend to Railway](#step-4-deploy-backend-to-railway)
6. [Step 5: Set Up Docker Locally](#step-5-set-up-docker-locally)
7. [Step 6: Configure GitHub Secrets](#step-6-configure-github-secrets)
8. [Step 7: Set Up Monitoring](#step-7-set-up-monitoring)
9. [Step 8: Test Everything](#step-8-test-everything)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before we start, make sure you have:
- A GitHub account
- A computer with internet access
- Basic command line knowledge (we'll guide you through everything)

---

## Step 1: Create Missing Configuration Files

### 1.1 Create MongoDB Initialization Script

Create the file `scripts/mongo-init.js`:

```bash
# In your project root directory, run:
mkdir -p scripts
```

Then create the file `scripts/mongo-init.js` with this content:

```javascript
// MongoDB initialization script for bazaarMKT
db = db.getSiblingDB('bazaarmkt-app');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "firstName", "lastName", "role"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        },
        firstName: { bsonType: "string" },
        lastName: { bsonType: "string" },
        role: {
          bsonType: "string",
          enum: ["artisan", "patron", "admin"]
        }
      }
    }
  }
});

db.createCollection('artisans');
db.createCollection('products');
db.createCollection('orders');
db.createCollection('reviews');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.products.createIndex({ "artisan": 1 });
db.products.createIndex({ "category": 1 });
db.products.createIndex({ "isFeatured": 1 });

print('✅ bazaarMKT database initialized successfully!');
```

### 1.2 Create Nginx Configuration

Create the directory and file:

```bash
mkdir -p nginx
```

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server app:4000;
    }

    server {
        listen 80;
        server_name localhost;

        # Frontend static files
        location / {
            root /var/www/html;
            try_files $uri $uri/ /index.html;
        }

        # API requests to backend
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # File uploads
        location /uploads/ {
            alias /var/www/uploads/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 1.3 Create Prometheus Configuration

Create the directory and file:

```bash
mkdir -p monitoring
```

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'bazaarmkt-app'
    static_configs:
      - targets: ['app:4000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
```

### 1.4 Create Grafana Data Sources

Create the directories:

```bash
mkdir -p monitoring/grafana/datasources
mkdir -p monitoring/grafana/dashboards
```

Create `monitoring/grafana/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

Create `monitoring/grafana/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

---

## Step 2: Set Up Environment Variables

### 2.1 Create Production Environment File

Create `.env.production` in your project root:

```bash
# Production Environment Variables for bazaarMKT
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://admin:your-secure-password@mongodb:27017/bazaarmkt-app?authSource=admin

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here-make-it-long-and-random
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=4000
FRONTEND_URL=https://your-bazaarmkt-app.vercel.app

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Payment Configuration (Optional)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# Redis Configuration
REDIS_URL=redis://redis:6379

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=https://your-bazaarmkt-app.vercel.app

# Monitoring
GRAFANA_PASSWORD=your-secure-grafana-password
```

### 2.2 Generate Secure Secrets

**For JWT Secret:**
```bash
# Generate a random JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**For MongoDB Password:**
```bash
# Generate a random password
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**For Grafana Password:**
```bash
# Generate a random password
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub account

### 3.2 Deploy Your Frontend

1. **Import Project:**
   - In Vercel dashboard, click "New Project"
   - Find your bazaarMKT repository
   - Click "Import"

2. **Configure Build Settings:**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`

3. **Set Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add these variables:
     ```
     VITE_API_URL=https://your-backend-url.railway.app/api
     VITE_APP_NAME=bazaarMKT
     ```

4. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Note your frontend URL (e.g., `https://your-bazaarmkt-app.vercel.app`)

### 3.3 Configure Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

---

## Step 4: Deploy Backend to Railway

### 4.1 Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Choose "Login with GitHub"
4. Authorize Railway to access your GitHub account

### 4.2 Deploy Your Backend

1. **Create New Project:**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your bazaarMKT repository

2. **Configure Service:**
   - Choose "Backend" folder
   - Railway will auto-detect it's a Node.js app

3. **Set Environment Variables:**
   - Go to Variables tab
   - Add these variables:
     ```
     NODE_ENV=production
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bazaarmkt-app
     JWT_SECRET=your-super-secure-jwt-secret
     FRONTEND_URL=https://your-bazaarmkt-app.vercel.app
     PORT=4000
     ```

4. **Set Up Database:**
   - Click "New" → "Database" → "MongoDB"
   - Railway will create a MongoDB instance
   - Copy the connection string to your MONGODB_URI variable

5. **Deploy:**
   - Railway will automatically deploy
   - Note your backend URL (e.g., `https://your-backend-url.railway.app`)

### 4.3 Configure Custom Domain (Optional)

1. In Railway dashboard, go to your service
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Configure DNS records

---

## Step 5: Set Up Docker Locally

### 5.1 Install Docker

**For Windows:**
1. Download Docker Desktop from [docker.com](https://docker.com)
2. Run the installer
3. Restart your computer
4. Open Docker Desktop

**For Mac:**
1. Download Docker Desktop from [docker.com](https://docker.com)
2. Drag to Applications folder
3. Open Docker Desktop

**For Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 5.2 Test Docker Installation

```bash
# Test Docker
docker --version
docker-compose --version

# Test with hello-world
docker run hello-world
```

### 5.3 Create SSL Directory

```bash
# Create SSL directory for Nginx
mkdir -p nginx/ssl

# Generate self-signed certificate for local development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/nginx-selfsigned.key \
  -out nginx/ssl/nginx-selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### 5.4 Run Docker Compose

```bash
# Start all services
docker-compose up -d

# Check running containers
docker-compose ps

# View logs
docker-compose logs -f app
```

---

## Step 6: Configure GitHub Secrets

### 6.1 Go to GitHub Repository Settings

1. Go to your GitHub repository
2. Click "Settings" tab
3. Click "Secrets and variables" → "Actions"

### 6.2 Add Required Secrets

Click "New repository secret" for each:

```
Name: MONGODB_URI
Value: mongodb+srv://username:password@cluster.mongodb.net/bazaarmkt-app

Name: JWT_SECRET
Value: your-super-secure-jwt-secret-key

Name: FRONTEND_URL
Value: https://your-bazaarmkt-app.vercel.app

Name: BACKEND_URL
Value: https://your-backend-url.railway.app

Name: VERCEL_TOKEN
Value: your-vercel-token

Name: RAILWAY_TOKEN
Value: your-railway-token
```

### 6.3 Get Vercel Token

1. Go to Vercel dashboard
2. Click your profile → "Settings"
3. Go to "Tokens" tab
4. Click "Create Token"
5. Copy the token

### 6.4 Get Railway Token

1. Go to Railway dashboard
2. Click your profile → "Account"
3. Go to "Tokens" tab
4. Click "Generate Token"
5. Copy the token

---

## Step 7: Set Up Monitoring

### 7.1 Update GitHub Actions for Deployment

Update your `.github/workflows/ci-cd.yml` deployment section:

```yaml
- name: Deploy to production
  run: |
    echo "Deploying to production..."
    
    # Deploy frontend to Vercel
    npm install -g vercel
    vercel --token ${{ secrets.VERCEL_TOKEN }} --prod --yes
    
    # Deploy backend to Railway
    npm install -g @railway/cli
    railway login --token ${{ secrets.RAILWAY_TOKEN }}
    railway up --service backend
```

### 7.2 Set Up Health Checks

Update the health check section:

```yaml
- name: Run post-deployment tests
  run: |
    echo "Running post-deployment health checks..."
    curl -f ${{ secrets.BACKEND_URL }}/api/health || exit 1
    echo "Backend health check passed"
    curl -f ${{ secrets.FRONTEND_URL }} || exit 1
    echo "Frontend health check passed"
```

### 7.3 Set Up Notifications

Add notification section:

```yaml
- name: Notify deployment status
  run: |
    echo "Deployment completed successfully!"
    # Add Slack notification
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"🚀 bazaarMKT deployed successfully!"}' \
      ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Step 8: Test Everything

### 8.1 Test Local Docker Setup

```bash
# Start all services
docker-compose up -d

# Check if all containers are running
docker-compose ps

# Test backend
curl http://localhost:4000/api/health

# Test frontend
curl http://localhost:80

# View logs if there are issues
docker-compose logs app
docker-compose logs mongodb
```

### 8.2 Test Production Deployment

1. **Push to main branch:**
   ```bash
   git add .
   git commit -m "Complete CI/CD setup"
   git push origin main
   ```

2. **Check GitHub Actions:**
   - Go to your GitHub repository
   - Click "Actions" tab
   - Watch the deployment pipeline

3. **Test Production URLs:**
   - Frontend: `https://your-bazaarmkt-app.vercel.app`
   - Backend: `https://your-backend-url.railway.app/api/health`

### 8.3 Test Monitoring

1. **Access Grafana:**
   - Go to `http://localhost:3000`
   - Login with admin/your-grafana-password

2. **Check Prometheus:**
   - Go to `http://localhost:9090`
   - Check if targets are up

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Docker Won't Start
```bash
# Check Docker status
docker info

# Restart Docker service
sudo systemctl restart docker  # Linux
# Or restart Docker Desktop on Windows/Mac
```

#### 2. MongoDB Connection Issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

#### 3. Vercel Deployment Fails
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify build command and output directory

#### 4. Railway Deployment Fails
- Check deployment logs in Railway dashboard
- Verify environment variables
- Ensure MongoDB connection string is correct

#### 5. GitHub Actions Fail
- Check Actions tab for error details
- Verify all secrets are set correctly
- Check if all required files exist

### Getting Help

1. **Check Logs:**
   ```bash
   # Docker logs
   docker-compose logs -f
   
   # GitHub Actions logs
   # Go to Actions tab in GitHub
   ```

2. **Common Commands:**
   ```bash
   # Restart services
   docker-compose restart
   
   # Rebuild containers
   docker-compose up --build
   
   # Clean up
   docker-compose down -v
   ```

3. **Useful Resources:**
   - [Vercel Documentation](https://vercel.com/docs)
   - [Railway Documentation](https://docs.railway.app)
   - [Docker Documentation](https://docs.docker.com)
   - [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## 🎉 Congratulations!

You've successfully set up a complete CI/CD pipeline for bazaarMKT! Your application now has:

- ✅ Automated testing
- ✅ Frontend deployment to Vercel
- ✅ Backend deployment to Railway
- ✅ Docker containerization
- ✅ Monitoring with Prometheus and Grafana
- ✅ Automated deployments on code changes
- ✅ Health checks and notifications

### Next Steps

1. **Customize your domain names**
2. **Set up SSL certificates for production**
3. **Configure additional monitoring alerts**
4. **Set up database backups**
5. **Add more comprehensive tests**

### Maintenance

- **Weekly:** Check deployment logs and monitoring
- **Monthly:** Update dependencies and security patches
- **Quarterly:** Review and rotate secrets
- **As needed:** Scale resources based on usage

Happy coding! 🚀
