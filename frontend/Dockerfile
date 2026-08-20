# ==========================================
# Frontend Production Multi-Stage Dockerfile
# ==========================================
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Run production React Vite build compilation
RUN npm run build

# ==========================================
# Web Server Runner Stage
# ==========================================
FROM nginx:stable-alpine

# Copy compiled SPA static bundles
COPY --from=builder /app/dist /usr/share/nginx/html

# Overwrite default Nginx configurations to support HTML5 client routers
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
