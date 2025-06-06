# syntax = docker/dockerfile:1
ARG NODE_VERSION=20

# Build stage
FROM node:${NODE_VERSION}-slim as build

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (fix for npm/rollup bug on Linux)
RUN npm cache clean --force
RUN npm install nuxt@^3.13.0 --save-dev
RUN npm install

# Copy source code
COPY . .

# Build Nuxt app
RUN npm run build

# Production stage
FROM node:${NODE_VERSION}-slim

WORKDIR /app

# Install curl for health check
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy only the built output (much smaller)
COPY --from=build /app/.output .output

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Health check for Nuxt app
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/status || exit 1

# Start the app
CMD ["node", ".output/server/index.mjs"]