# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
# Copy compiled files to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html
# Expose port 80 strictly for the internal Docker network
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]