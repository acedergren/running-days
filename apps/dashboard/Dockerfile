# Running Days Dashboard - Multi-stage build
# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY turbo.json ./

# Copy ALL package.json files to satisfy pnpm workspace resolution
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/database/package.json ./packages/database/
COPY packages/business-logic/package.json ./packages/business-logic/
COPY packages/observability/package.json ./packages/observability/
COPY apps/api/package.json ./apps/api/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY apps/landing/package.json ./apps/landing/
COPY apps/web/package.json ./apps/web/

# Install ALL dependencies (need devDependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code for types and dashboard only
COPY packages/types/ ./packages/types/
COPY apps/dashboard/ ./apps/dashboard/

# Build types package first, then dashboard
# Use explicit paths to hoisted binaries in root node_modules
RUN cd packages/types && /app/node_modules/.bin/tsc && \
    cd /app/apps/dashboard && /app/node_modules/.bin/svelte-kit sync && /app/node_modules/.bin/vite build

# ============================================================================
# Stage 2: Production image
# ============================================================================
FROM node:22-slim AS production

# Security: Run as non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Copy built application (SvelteKit with adapter-node)
COPY --from=builder /app/apps/dashboard/build ./build

# Create minimal package.json with only runtime dependencies (no workspace:* protocol)
RUN echo '{"name":"@running-days/dashboard","type":"module","dependencies":{"clsx":"^2.1.1","tailwind-merge":"^2.6.0","tailwind-variants":"^0.3.0"}}' > package.json && \
    npm install --omit=dev

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
