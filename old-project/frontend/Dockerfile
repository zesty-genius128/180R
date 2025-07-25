# frontend/Dockerfile
# Multi-stage build for React app

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build arguments for environment variables
ARG REACT_APP_API_URL=http://localhost:3001/api
ARG REACT_APP_WS_URL=ws://localhost:3001

# Set environment variables
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV GENERATE_SOURCEMAP=false

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Install wget for health checks
RUN apk add --no-cache wget

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]