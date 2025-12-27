# Running Days Dashboard - Multi-stage build
# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package.json files for required workspaces
COPY packages/types/package.json ./packages/types/
COPY apps/dashboard/package.json ./apps/dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types/ ./packages/types/
COPY apps/dashboard/ ./apps/dashboard/

# Build types package first, then dashboard
RUN pnpm --filter "@running-days/types" build && \
    pnpm --filter "@running-days/dashboard" build

# ============================================================================
# Stage 2: Production image
# ============================================================================
FROM node:22-slim AS production

# Security: Run as non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Copy built application (SvelteKit with adapter-node)
COPY --from=builder /app/apps/dashboard/build ./build
COPY --from=builder /app/apps/dashboard/package.json ./

# Install production dependencies only (minimal for adapter-node)
RUN npm install --omit=dev

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Environment
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV ORIGIN=http://localhost:3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3001').then(r => r.ok ? process.exit(0) : process.exit(1))"

EXPOSE 3001

CMD ["node", "build"]
