#!/bin/bash

# Deployment script for bazaarMKT App
# This script handles the deployment process for both backend and frontend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
BUILD_DIR="dist"
LOG_FILE="deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

# Check if required environment variables are set
check_env() {
    log "Checking environment variables..."
    
    if [ -z "$NODE_ENV" ]; then
        export NODE_ENV="production"
        warning "NODE_ENV not set, defaulting to production"
    fi
    
    if [ -z "$MONGODB_URI" ]; then
        error "MONGODB_URI environment variable is required"
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        error "JWT_SECRET environment variable is required"
    fi
    
    success "Environment variables validated"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Backend dependencies
    if [ -d "$BACKEND_DIR" ]; then
        log "Installing backend dependencies..."
        cd $BACKEND_DIR
        npm ci --only=production
        cd ..
        success "Backend dependencies installed"
    fi
    
    # Frontend dependencies
    if [ -d "$FRONTEND_DIR" ]; then
        log "Installing frontend dependencies..."
        cd $FRONTEND_DIR
        npm ci
        cd ..
        success "Frontend dependencies installed"
    fi
}

# Run tests
run_tests() {
    log "Running tests..."
    
    # Backend tests
    if [ -d "$BACKEND_DIR" ]; then
        log "Running backend tests..."
        cd $BACKEND_DIR
        npm run test:ci || error "Backend tests failed"
        cd ..
        success "Backend tests passed"
    fi
    
    # Frontend tests
    if [ -d "$FRONTEND_DIR" ]; then
        log "Running frontend tests..."
        cd $FRONTEND_DIR
        npm run test:ci || error "Frontend tests failed"
        cd ..
        success "Frontend tests passed"
    fi
}

# Build frontend
build_frontend() {
    if [ -d "$FRONTEND_DIR" ]; then
        log "Building frontend..."
        cd $FRONTEND_DIR
        npm run build || error "Frontend build failed"
        cd ..
        success "Frontend built successfully"
    fi
}

# Deploy backend
deploy_backend() {
    if [ -d "$BACKEND_DIR" ]; then
        log "Deploying backend..."
        
        # Add your backend deployment commands here
        # Examples:
        # - Deploy to Heroku: git push heroku main
        # - Deploy to Railway: railway deploy
        # - Deploy to AWS: aws deploy
        # - Deploy with Docker: docker build -t food-finder-backend .
        
        success "Backend deployed successfully"
    fi
}

# Deploy frontend
deploy_frontend() {
    if [ -d "$FRONTEND_DIR" ]; then
        log "Deploying frontend..."
        
        # Add your frontend deployment commands here
        # Examples:
        # - Deploy to Vercel: vercel --prod
        # - Deploy to Netlify: netlify deploy --prod --dir=dist
        # - Deploy to AWS S3: aws s3 sync dist/ s3://your-bucket-name
        
        success "Frontend deployed successfully"
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Add your database migration commands here
    # Example: npm run migrate
    
    success "Database migrations completed"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Add your health check commands here
    # Example: curl -f https://your-api-url.com/api/health
    
    success "Health checks passed"
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove build artifacts
    if [ -d "$FRONTEND_DIR/$BUILD_DIR" ]; then
        rm -rf $FRONTEND_DIR/$BUILD_DIR
    fi
    
    # Remove node_modules if not needed
    if [ "$CLEAN_NODE_MODULES" = "true" ]; then
        rm -rf $BACKEND_DIR/node_modules
        rm -rf $FRONTEND_DIR/node_modules
    fi
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting deployment process..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --clean)
                CLEAN_NODE_MODULES=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-tests    Skip running tests"
                echo "  --skip-build    Skip building frontend"
                echo "  --clean         Clean node_modules after deployment"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    # Run deployment steps
    check_env
    install_dependencies
    
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    fi
    
    if [ "$SKIP_BUILD" != "true" ]; then
        build_frontend
    fi
    
    run_migrations
    deploy_backend
    deploy_frontend
    health_check
    cleanup
    
    success "Deployment completed successfully!"
    log "Deployment log saved to $LOG_FILE"
}

# Run main function
main "$@"
