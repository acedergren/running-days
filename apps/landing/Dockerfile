# Running Days Landing Page - Static build with nginx
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

# Copy package.json for landing app
COPY apps/landing/package.json ./apps/landing/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/landing/ ./apps/landing/

# Build static site
RUN pnpm --filter "@running-days/landing" build

# ============================================================================
# Stage 2: Serve with nginx
# ============================================================================
FROM nginx:alpine AS production

# Copy built static files
COPY --from=builder /app/apps/landing/build /usr/share/nginx/html

# Custom nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
