#!/bin/bash

# bazaarMKT Setup Script for Beginners
# This script helps set up the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if required tools are installed
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ is required. Current version: $(node -v)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        error "Git is not installed. Please install Git from https://git-scm.com"
    fi
    
    success "All requirements met!"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Backend dependencies
    if [ -d "backend" ]; then
        log "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
        success "Backend dependencies installed"
    fi
    
    # Frontend dependencies
    if [ -d "frontend" ]; then
        log "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        success "Frontend dependencies installed"
    fi
}

# Create environment files
create_env_files() {
    log "Creating environment files..."
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        cat > backend/.env << EOF
# Development Environment Variables
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/bazaarmkt-dev
JWT_SECRET=dev-jwt-secret-key-change-in-production
PORT=4000
FRONTEND_URL=http://localhost:5180
EOF
        success "Created backend/.env"
    else
        warning "backend/.env already exists, skipping..."
    fi
    
    # Frontend .env
    if [ ! -f "frontend/.env" ]; then
        cat > frontend/.env << EOF
# Development Environment Variables
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=bazaarMKT
EOF
        success "Created frontend/.env"
    else
        warning "frontend/.env already exists, skipping..."
    fi
    
    # Production .env
    if [ ! -f ".env.production" ]; then
        cat > .env.production << EOF
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
EOF
        success "Created .env.production"
    else
        warning ".env.production already exists, skipping..."
    fi
}

# Generate secure secrets
generate_secrets() {
    log "Generating secure secrets..."
    
    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    echo "Generated JWT Secret: $JWT_SECRET"
    
    # Generate MongoDB password
    MONGO_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    echo "Generated MongoDB Password: $MONGO_PASSWORD"
    
    # Generate Grafana password
    GRAFANA_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('base64'))")
    echo "Generated Grafana Password: $GRAFANA_PASSWORD"
    
    success "Secrets generated! Please save these securely."
}

# Check Docker installation
check_docker() {
    log "Checking Docker installation..."
    
    if command -v docker &> /dev/null; then
        success "Docker is installed: $(docker --version)"
        
        if command -v docker-compose &> /dev/null; then
            success "Docker Compose is installed: $(docker-compose --version)"
        else
            warning "Docker Compose not found. Please install Docker Compose"
        fi
    else
        warning "Docker not found. Please install Docker Desktop from https://docker.com"
        echo "Docker is required for local development with containers."
    fi
}

# Create SSL certificates for local development
create_ssl_certs() {
    log "Creating SSL certificates for local development..."
    
    if [ -d "nginx/ssl" ]; then
        if [ ! -f "nginx/ssl/nginx-selfsigned.crt" ]; then
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
              -keyout nginx/ssl/nginx-selfsigned.key \
              -out nginx/ssl/nginx-selfsigned.crt \
              -subj "/C=US/ST=State/L=City/O=bazaarMKT/CN=localhost"
            success "SSL certificates created"
        else
            warning "SSL certificates already exist, skipping..."
        fi
    else
        warning "nginx/ssl directory not found. Please run the complete setup guide first."
    fi
}

# Test the setup
test_setup() {
    log "Testing the setup..."
    
    # Test backend
    if [ -d "backend" ]; then
        cd backend
        if npm test --silent; then
            success "Backend tests passed"
        else
            warning "Backend tests failed or not configured"
        fi
        cd ..
    fi
    
    # Test frontend
    if [ -d "frontend" ]; then
        cd frontend
        if npm run build --silent; then
            success "Frontend build successful"
        else
            warning "Frontend build failed"
        fi
        cd ..
    fi
}

# Main setup function
main() {
    echo "🚀 bazaarMKT Setup Script"
    echo "========================="
    echo ""
    
    check_requirements
    install_dependencies
    create_env_files
    generate_secrets
    check_docker
    create_ssl_certs
    test_setup
    
    echo ""
    echo "✅ Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Review and update the generated .env files with your actual values"
    echo "2. Follow the COMPLETE-SETUP-GUIDE.md for deployment setup"
    echo "3. Start development with:"
    echo "   - Backend: cd backend && npm run dev"
    echo "   - Frontend: cd frontend && npm run dev"
    echo ""
    echo "For Docker development:"
    echo "   docker-compose up -d"
    echo ""
    echo "Happy coding! 🎉"
}

# Run main function
main "$@"
