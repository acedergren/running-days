# Running Days API - Multi-stage build
# ============================================================================
# Stage 1: Build dependencies and compile TypeScript
# ============================================================================
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package.json files for all workspaces
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/database/package.json ./packages/database/
COPY packages/business-logic/package.json ./packages/business-logic/
COPY packages/observability/package.json ./packages/observability/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build packages and API
RUN pnpm --filter "@running-days/types" build && \
    pnpm --filter "@running-days/utils" build && \
    pnpm --filter "@running-days/database" build && \
    pnpm --filter "@running-days/business-logic" build && \
    pnpm --filter "@running-days/observability" build && \
    pnpm --filter "@running-days/api" build

# ============================================================================
# Stage 2: Production image
# ============================================================================
FROM node:22-slim AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Security: Run as non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Copy built packages
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/business-logic/package.json ./packages/business-logic/
COPY --from=builder /app/packages/business-logic/dist ./packages/business-logic/dist
COPY --from=builder /app/packages/observability/package.json ./packages/observability/
COPY --from=builder /app/packages/observability/dist ./packages/observability/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

EXPOSE 3000

WORKDIR /app/apps/api

CMD ["node", "dist/index.js"]
