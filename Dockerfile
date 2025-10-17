# Optimized Dockerfile for faster builds

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (we need them for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies to save space (keep drizzle-kit for migrations)
RUN npm prune --production && npm install drizzle-kit

# Copy necessary runtime files
COPY shared ./shared
COPY drizzle.config.ts ./

# Create logs directory
RUN mkdir -p logs

# Environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Start command
CMD ["sh", "-c", "npx drizzle-kit push --force && node dist/index.js"]
