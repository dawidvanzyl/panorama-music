# Stage 1 — builder
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2 — serve
FROM nginx:alpine AS serve

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
