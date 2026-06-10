# ArtNepalaya Monorepo

A unified repository containing the complete ArtNepalaya platform: a social art discovery platform for Nepali artists and art lovers.

## Repository Structure

```
artnepalaya-monorepo/
├── backend/          # Node.js Express API (ES Modules)
│   ├── src/          # Application source code
│   ├── docker-compose.yml      # Local development orchestration
│   ├── docker-compose.prod.yml # Production deployment
│   ├── Dockerfile              # Development container
│   ├── Dockerfile.prod         # Production container (PM2)
│   └── nginx/                  # Reverse proxy configs
│       ├── nginx.conf          # Development (HTTP only)
│       └── nginx.prod.conf     # Production (HTTPS + redirect)
├── admin/            # Vite React Admin Panel (TypeScript)
│   ├── src/          # React source code
│   ├── Dockerfile    # Multi-stage build (build + nginx)
│   └── nginx.conf    # SPA routing config
├── mobile/           # Expo React Native App (TypeScript)
│   └── src/          # App source code
└── README.md
```

## Prerequisites

- Node.js 20+ (22 for production)
- Docker and Docker Compose
- Expo CLI (`npm install -g expo-cli`) for mobile development
- Android Studio or Xcode for mobile emulation

## Quick Start (Docker - Recommended)

The fastest way to run the full stack locally:

```bash
# 1. Clone the repository
git clone https://github.com/bhaweshkaflecse/artnepalaya-monorepo.git
cd artnepalaya-monorepo

# 2. Set up backend environment
cd backend
cp .env.example .env
# Edit .env if you need to change any defaults (optional for local dev)

# 3. Start all services (MongoDB, PostgreSQL, Redis, Backend, Admin, Nginx)
docker-compose up -d --build

# 4. Seed the database with test data
docker exec art_backend npm run seed:all:clear

# 5. Access the application
# Admin Panel: http://localhost (through Nginx proxy)
# API:         http://localhost/api/v1/health
```

## Environment Setup

Each application has its own environment configuration:

### Backend (`backend/`)

| Variable | Description | Default (Dev) |
|----------|-------------|---------------|
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `http://localhost:5173,http://localhost:3000,http://localhost:80` |
| `MONGO_URI` | MongoDB connection string | `mongodb://root:password@mongodb:27017/artnepalaya?authSource=admin` |
| `POSTGRES_URI` | PostgreSQL connection string | `postgresql://postgres:password@postgresql:5432/artnepalaya` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_ACCESS_SECRET` | JWT signing key (min 32 chars) | placeholder |
| `JWT_REFRESH_SECRET` | JWT refresh key (min 32 chars) | placeholder |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | placeholder |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | placeholder |
| `CLOUDINARY_API_KEY` | Cloudinary API key | placeholder |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | placeholder |
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB root user | `root` |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB root password | `password` |
| `POSTGRES_USER` | PostgreSQL user | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `password` |
| `POSTGRES_DB` | PostgreSQL database name | `artnepalaya` |

### Admin Panel (`admin/`)

| Variable | Description | Default (Dev) |
|----------|-------------|---------------|
| `VITE_API_URL` | Backend API URL | `http://localhost:80/api/v1` |

### Mobile App (`mobile/`)

| Variable | Description | Default (Dev) |
|----------|-------------|---------------|
| `EXPO_PUBLIC_API_URL` | Backend API URL | `http://10.0.2.2:8080/api/v1` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID | placeholder |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID | placeholder |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID | placeholder |

### Setting Up Environment Files

```bash
# Backend
cd backend
cp .env.example .env          # For Docker Compose local dev

# Admin (already has .env.development checked in)
cd admin
# .env.development is pre-configured for local Docker dev

# Mobile
cd mobile
cp .env.example .env          # For Expo development
```

## Running Without Docker

### Backend (standalone)

```bash
cd backend
cp .env.example .env

# Update hostnames from Docker service names to localhost:
# MONGO_URI=mongodb://root:password@localhost:27017/artnepalaya?authSource=admin
# POSTGRES_URI=postgresql://postgres:password@localhost:5432/artnepalaya
# REDIS_URL=redis://localhost:6380

npm install
npm run dev
```

> Note: You must have MongoDB, PostgreSQL, and Redis running locally.

### Admin Panel (standalone)

```bash
cd admin
npm install
npm run dev
# Opens at http://localhost:5173
```

### Mobile App

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

- **Android Emulator**: Uses `10.0.2.2` to reach host machine (already configured in .env.example)
- **iOS Simulator**: Change `EXPO_PUBLIC_API_URL` to `http://localhost:8080/api/v1`
- **Physical Device**: Change to your computer's LAN IP (e.g., `http://192.168.1.x:8080/api/v1`)

## Database Seeding

The mega-seeder creates 56 users, 110 posts, reports, featured posts, CMS pages, and app configuration:

```bash
# Via Docker
docker exec art_backend npm run seed:all:clear

# Or standalone
cd backend
npm run seed:all:clear
```

### Default Admin Credentials

After seeding:
- **Email**: `admin@artnepalaya.com`
- **Password**: `admin123`

Use these credentials to log into the admin panel at `http://localhost`.

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select an existing one
3. Navigate to APIs & Services > Credentials
4. Create an OAuth 2.0 Client ID:
   - **Web application**: Used by backend token verification
   - **Android**: For mobile app (requires SHA-1 fingerprint)
   - **iOS**: For mobile app (requires bundle identifier)
5. Set the client IDs in your environment files:
   - `backend/.env` - Set `GOOGLE_CLIENT_ID` (web client ID)
   - `mobile/.env` - Set all three `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` vars

### Auth Flow

```
Mobile App
  -> User taps "Sign in with Google"
  -> expo-auth-session opens Google consent screen
  -> Receives Google ID token
  -> POST /api/v1/auth/google { idToken, deviceId }
  -> Backend verifies with Google, creates/finds user
  -> Returns { user, accessToken, refreshToken }
  -> Mobile stores tokens in SecureStore
  -> Redux state updated, navigation switches to MainTabs
```

## Production Deployment (VPS)

```bash
cd backend

# 1. Create production environment file
cp .env.production .env
# Edit .env - replace ALL "CHANGE_ME" placeholders with real values

# 2. Set up SSL certificates
mkdir -p nginx/certs
# Option A: Use Certbot
certbot certonly --standalone -d artnepalaya.com -d admin.artnepalaya.com
cp /etc/letsencrypt/live/artnepalaya.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/artnepalaya.com/privkey.pem nginx/certs/

# Option B: Place your own certs
cp your-cert.pem nginx/certs/fullchain.pem
cp your-key.pem nginx/certs/privkey.pem

# 3. Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Seed database (first time only)
docker exec art_backend npm run seed:all:clear
```

### Production Architecture

```
Internet -> Nginx (port 80/443)
              ├── /api/*  -> Backend (port 8080, PM2 cluster mode)
              └── /*      -> Admin Panel (static files via nginx)

Backend -> MongoDB (internal network only)
        -> PostgreSQL (internal network only)
        -> Redis (internal network only)
```

## Docker Services

| Service | Container | Internal Port | External Port (Dev) |
|---------|-----------|---------------|---------------------|
| `proxy` | art_nginx_proxy | 80, 443 | 80, 443 |
| `backend` | art_backend | 8080 | (via proxy) |
| `admin` | art_admin | 80 | (via proxy) |
| `mongodb` | art_mongodb | 27017 | 27017 |
| `postgresql` | art_postgresql | 5432 | 5432 |
| `redis` | art_redis | 6379 | 6380 |

> Redis is mapped to port 6380 externally to prevent conflicts with a local Redis instance on Windows.

## API Endpoints

### Public
- `GET /health` - Health check
- `POST /api/v1/auth/google` - Google OAuth login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/admin-login` - Admin panel login

### Protected (requires JWT)
- `GET /api/v1/posts/feed` - Get post feed
- `POST /api/v1/posts/:id/likes` - Like a post
- `POST /api/v1/reports` - Report content
- `GET /api/v1/users/profile` - Get user profile

### Admin
- `GET /api/v1/admin/dashboard` - Dashboard analytics
- `GET /api/v1/admin/users` - User management
- `PUT /api/v1/admin/featured` - Manage featured posts

## Known Development Notes

- The `console.log` for OTP in `auth.service.js` is intentional for development testing (OTPs are logged to console since SMS sending is not configured)
- The `console.log` statements in `server.js` and `cloudinary.js` are server startup diagnostics and are appropriate for production logging
- The seeder scripts use `console.log` for progress reporting during execution

## Troubleshooting

### Backend won't connect to databases
- Ensure Docker containers are running: `docker ps`
- Check that hostnames in `.env` match Docker Compose service names (`mongodb`, `postgresql`, `redis`)
- For standalone (non-Docker) development, use `localhost` instead of service names

### Admin panel shows blank page after refresh
- The admin nginx config (`admin/nginx.conf`) includes `try_files $uri $uri/ /index.html` for SPA routing
- If running without Docker, ensure your dev server handles client-side routing

### Mobile app cannot reach API
- Android Emulator: Use `http://10.0.2.2:8080/api/v1`
- iOS Simulator: Use `http://localhost:8080/api/v1`
- Physical device: Use your machine's LAN IP address
- Ensure the backend is running and accessible on port 8080

### Google Sign-In not working
- Ensure all three client IDs are configured (web, Android, iOS)
- The web client ID must also be set in the backend for token verification
- expo-auth-session requires a proper redirect URI configuration
