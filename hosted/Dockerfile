# Running Days Hosted - Production Container
# Multi-stage build for minimal image size

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM node:22-slim AS production

# Security: Run as non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Oracle client dependencies (for oracledb)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libaio1 \
    && rm -rf /var/lib/apt/lists/*

# Create wallet directory (will be mounted at runtime)
RUN mkdir -p /app/.wallet && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

EXPOSE 3000

CMD ["node", "build"]
