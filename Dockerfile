# Railway Dockerfile for Backend Only
FROM node:22-alpine

# Set working directory to backend
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/index.js"]
