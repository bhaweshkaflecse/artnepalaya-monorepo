FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Use ci for exact version installation in production
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]