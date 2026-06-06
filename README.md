# ArtNepalaya Monorepo

A unified repository containing the complete ArtNepalaya platform.

## Structure

```
├── backend/    # Node.js Express API
├── admin/      # Vite React Admin Panel
├── mobile/     # Expo React Native App
```

## Quick Start

### Backend
```bash
cd backend
npm install
docker-compose up -d  # Start MongoDB, Redis
npm run dev
```

### Admin Panel
```bash
cd admin
npm install
npm run dev
```

### Mobile App
```bash
cd mobile
npm install
npx expo start
```

## Database Seeding
```bash
cd backend
npm run seed:all:clear
```

Admin credentials: `admin@artnepalaya.com` / `admin123`

## Production Deployment
```bash
cd backend
docker-compose -f docker-compose.prod.yml up -d --build
```
