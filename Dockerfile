FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl git build-essential python3

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/api/prisma ./apps/api/prisma
RUN npm ci

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
# Build all workspaces
RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
# Copy package.jsons again to install prod deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.ts ./apps/web/
# Note: copying next.config.ts might not be enough if it needs TS compilation, 
# but next.config.js is usually standard. If it is .ts, Next.js handles it if ts-node is reliable or if it was compiled.
# However, usually for production run we just need the built .next. 
# We'll copy source config just in case.

# Copy Prisma schema and generated client if needed
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
# Actually, the generated client is in node_modules, which we wiped. 
# We need to generate it again in runner or copy node_modules from builder.
# Copying from builder is safer for consistency but includes devDeps. 
# Let's regenerate client in runner for safety with prod deps or just copy specific node_modules.
# Simpler approach for "offline script": Use builder's node_modules BUT prune them?
# Or just accept the size for now. 
# Let's go with: clean install prod deps, then generate prisma client again.
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Add concurrently to run both
RUN npm install -g concurrently

# Expose ports
EXPOSE 3000 3001

# Command to run both
# API on 3001, Web on 3000
CMD ["concurrently", "\"node apps/api/dist/main\"", "\"npm start --workspace=apps/web\""]
