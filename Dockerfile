# Railway Dockerfile for Backend Only
FROM node:22-alpine

# Set working directory to backend
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (use npm install since we don't have package-lock.json)
RUN npm install --production

# Copy backend source code
COPY backend/ ./

# Build TypeScript (need to install dev dependencies for build)
RUN npm install && npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/index.js"]
