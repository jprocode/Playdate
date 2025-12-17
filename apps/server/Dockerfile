# PlayDate Server Dockerfile
# Multi-stage build for production

# ===== Base Stage =====
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for native modules (argon2)
RUN apk add --no-cache libc6-compat python3 make g++

# ===== Dependencies Stage =====
FROM base AS deps

# Copy package files
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/game-core/package.json ./packages/game-core/

# Install dependencies
RUN npm ci --workspace=@playdate/server

# ===== Builder Stage =====
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules 2>/dev/null || true

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/game-core ./packages/game-core
COPY apps/server ./apps/server

# Generate Prisma client
WORKDIR /app/apps/server
RUN npx prisma generate

# Build packages
WORKDIR /app
RUN npm run build --workspace=@playdate/shared
RUN npm run build --workspace=@playdate/game-core
RUN npm run build --workspace=@playdate/server

# ===== Production Stage =====
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 playdate

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Copy built assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/game-core/dist ./packages/game-core/dist
COPY --from=builder /app/packages/game-core/package.json ./packages/game-core/
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma

# Change ownership
RUN chown -R playdate:nodejs /app

# Switch to non-root user
USER playdate

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
WORKDIR /app/apps/server
CMD ["node", "dist/index.js"]

