# Stage 1 — builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests needed for npm ci
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/

# Install backend workspace dependencies
RUN npm ci --workspace=packages/backend

# Copy tsconfig and backend source
COPY tsconfig.base.json ./
COPY packages/backend/ ./packages/backend/

# Build
RUN npm run build --workspace=packages/backend

# Stage 2 — production
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/node_modules ./node_modules
COPY --from=builder /app/packages/backend/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/server.js"]
