# syntax = docker/dockerfile:1
ARG NODE_VERSION=20

# Build stage
FROM node:${NODE_VERSION}-slim as build

WORKDIR /build

# Install pnpm
RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy brain package files
COPY packages/brain/package.json ./packages/brain/

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Copy entire brain source code
COPY packages/brain/ ./packages/brain/

# Build Nuxt app
RUN cd packages/brain && pnpm run build

# Production stage
FROM node:${NODE_VERSION}-slim

WORKDIR /app

# Install curl for health check
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create data directory for database persistence
RUN mkdir -p /app/data && chmod 755 /app/data

# Install pnpm in production image
RUN npm install -g pnpm

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_PATH=/app/data/coachartie.db
ENV PRODUCTION=true

# Copy only the built output (much smaller)
COPY --from=build /build/packages/brain/.output .output

EXPOSE 3000

# Volume mount point for persistent database storage
VOLUME ["/app/data"]

# Health check for Nuxt app
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/status || exit 1

# Start the app
CMD ["node", ".output/server/index.mjs"]