# Stage 1 — builder
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy workspace manifests needed for npm ci
COPY package.json package-lock.json ./
COPY packages/frontend/package.json ./packages/frontend/

# Install frontend workspace dependencies
RUN npm ci --workspace=packages/frontend

# Copy tsconfig and frontend source
COPY tsconfig.base.json ./
COPY packages/frontend/ ./packages/frontend/

# Build
RUN npm run build --workspace=packages/frontend

# Stage 2 — serve
FROM nginx:alpine AS serve

COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
