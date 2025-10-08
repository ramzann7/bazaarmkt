# Multi-stage Docker build for bazaarMKT App

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Stage 3: Production image
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy backend from builder stage
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend ./backend

# Copy frontend build from builder stage
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

# Copy configuration files
COPY --chown=nodejs:nodejs config/ ./config/
COPY --chown=nodejs:nodejs scripts/ ./scripts/

# Create necessary directories
RUN mkdir -p /app/backend/public/uploads /app/backend/logs
RUN chown -R nodejs:nodejs /app/backend/public /app/backend/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/server.js"]
