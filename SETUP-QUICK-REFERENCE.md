# 🚀 bazaarMKT Setup Quick Reference

## 📋 Prerequisites Checklist

- [ ] GitHub account
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Docker Desktop installed (optional for local development)

## 🛠️ Quick Setup Commands

### 1. Initial Setup
```bash
# Run the setup script
./scripts/setup.sh

# Or manually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # MongoDB Password
```

### 3. Local Development
```bash
# Start backend
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

### 4. Docker Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🌐 Deployment Platforms

### Frontend: Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository
4. Set build settings:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Backend: Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project from GitHub repo
4. Add MongoDB database
5. Set environment variables

## 🔐 GitHub Secrets Required

Go to Repository → Settings → Secrets and variables → Actions

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bazaarmkt-app
JWT_SECRET=your-super-secure-jwt-secret
FRONTEND_URL=https://your-bazaarmkt-app.vercel.app
BACKEND_URL=https://your-backend-url.railway.app
VERCEL_TOKEN=your-vercel-token
RAILWAY_TOKEN=your-railway-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/... (optional)
```

## 🐳 Docker Commands

```bash
# Build and start
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f app
docker-compose logs -f mongodb

# Stop and remove volumes
docker-compose down -v

# Restart specific service
docker-compose restart app
```

## 🧪 Testing Commands

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Run all tests
npm run test:ci
```

## 📊 Monitoring URLs (Local)

- **Application**: http://localhost:4000
- **Frontend**: http://localhost:80 (via Nginx)
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090

## 🚨 Common Issues & Solutions

### Docker Issues
```bash
# Restart Docker Desktop
# Or restart Docker service (Linux)
sudo systemctl restart docker
```

### MongoDB Connection Issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Port Already in Use
```bash
# Find process using port
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill process
kill -9 <PID>
```

### Environment Variables Not Loading
```bash
# Check if .env files exist
ls -la backend/.env frontend/.env

# Verify file format (no spaces around =)
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/bazaarmkt-dev
```

## 📞 Getting Help

1. **Check Logs**: Always check logs first
2. **GitHub Issues**: Create an issue in your repository
3. **Documentation**: Refer to COMPLETE-SETUP-GUIDE.md
4. **Community**: Ask in relevant forums or Discord channels

## 🎯 Success Indicators

✅ **Setup Complete When:**
- [ ] All dependencies installed
- [ ] Environment files created
- [ ] Docker containers running
- [ ] Backend accessible at http://localhost:4000
- [ ] Frontend accessible at http://localhost:80
- [ ] Tests passing
- [ ] GitHub Actions workflow configured
- [ ] Production deployments working

## 🔄 Daily Development Workflow

```bash
# 1. Start development
cd backend && npm run dev &
cd frontend && npm run dev

# 2. Make changes
# Edit your code...

# 3. Test changes
npm test

# 4. Commit and push
git add .
git commit -m "Your changes"
git push origin main

# 5. Watch deployment
# Check GitHub Actions tab
```

## 🚀 Production Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables set in production
- [ ] Database migrations run
- [ ] SSL certificates configured
- [ ] Monitoring set up
- [ ] Backup procedures in place
- [ ] Health checks working
- [ ] Rollback plan ready

---

**Need more help?** Check the `COMPLETE-SETUP-GUIDE.md` for detailed instructions!
