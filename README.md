# Art Nepalaya — Monorepo

Nepal's first social art discovery platform connecting artists, art lovers, galleries, and creative businesses.

> **Status:** MVP Live (Android)  
> **Production:** [artnepalaya.com](https://artnepalaya.com) | [admin.artnepalaya.com](https://admin.artnepalaya.com) | [api.artnepalaya.com](https://api.artnepalaya.com)  
> **Share Pages:** [app.artnepalaya.com](https://app.artnepalaya.com)

---

## Repository Structure

```
artnepalaya-monorepo/
├── backend/              # Node.js Express API (ES Modules)
│   ├── src/
│   │   ├── modules/      # Domain modules (auth, posts, users, admin, notifications, etc.)
│   │   ├── middlewares/  # Auth, upload, validation, security
│   │   ├── shared/       # Utils (cache, push), services (pushService)
│   │   ├── realtime/     # Socket.IO (emitter, events, socketServer)
│   │   ├── config/       # Environment, Cloudinary
│   │   └── server.js     # Entry point
│   ├── nginx/            # Reverse proxy configs (dev + prod)
│   ├── docker-compose.yml        # Local development
│   ├── docker-compose.prod.yml   # Production deployment
│   └── Dockerfile.prod           # Production container (PM2 cluster)
├── admin/                # Vite React Admin Panel (TypeScript + Tailwind)
│   └── src/pages/        # Dashboard, Posts, Users, Moderation, Featured,
│                         # ArtworkTypes, PushNotifications, RecommendationEngine, etc.
├── mobile/               # Expo React Native App (SDK 50, TypeScript)
│   ├── src/
│   │   ├── screens/      # Auth, Home, Explore, Create, Profile, etc.
│   │   ├── services/     # API, push, notifications, socket, config
│   │   ├── store/        # Redux Toolkit (auth, feed, app, user, notification)
│   │   └── navigation/   # React Navigation (AppStack, MainTabs, AuthStack)
│   ├── android/          # Native Android project (prebuild)
│   └── assets/           # Icons, splash, notification icon, Nepal flag
├── PRD.md                # Comprehensive Product Requirements Document
├── ENGINEERING_HANDOFF.md
├── RELEASE_CHECKLIST.md
└── README.md             # This file
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo SDK 50, React Native 0.73.6, Redux Toolkit, Socket.IO Client |
| Backend | Node.js 22, Express, Mongoose (MongoDB), Redis, Socket.IO, Cloudinary |
| Admin | Vite, React, TypeScript, Tailwind CSS, Zustand |
| Database | MongoDB (primary), Redis (caching + sessions) |
| Media | Cloudinary (images + video hosting with on-the-fly transforms) |
| Auth | Native Google Sign-In (`@react-native-google-signin/google-signin`) |
| Push | Expo Push Notifications + Firebase Cloud Messaging (FCM) |
| Real-time | Socket.IO for notifications and feed updates |
| Deployment | Docker Compose on Ncell Cloud (Ubuntu 24.04), Cloudflare DNS |
| Mobile Builds | EAS Build (preview APK + production AAB) |

## Production URLs

| Domain | Purpose |
|--------|---------|
| `artnepalaya.com` | Marketing website (cPanel) |
| `api.artnepalaya.com` | Backend API + Socket.IO |
| `admin.artnepalaya.com` | Admin Panel |
| `app.artnepalaya.com` | Share landing pages + deep links + Android App Links |

## Prerequisites

- Node.js 22+
- Docker and Docker Compose
- EAS CLI (`npm install -g eas-cli`) for mobile builds
- Android Studio (for local development builds)

## Quick Start (Local Development)

```bash
# 1. Clone
git clone https://github.com/bhaweshkaflecse/artnepalaya-monorepo.git
cd artnepalaya-monorepo

# 2. Backend
cd backend
cp .env.example .env
docker-compose up -d --build

# 3. Seed database
docker exec art_backend npm run seed:all:clear

# 4. Access
# API:    http://localhost:8080/api/v1/health
# Admin:  http://localhost (via nginx proxy)

# 5. Mobile (separate terminal)
cd mobile
cp .env.example .env
npm install
npx expo start
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 8080) |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | JWT signing key (min 32 chars) |
| `JWT_REFRESH_SECRET` | JWT refresh key (min 32 chars) |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### Mobile (`mobile/.env`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API URL (e.g., `https://api.artnepalaya.com/api/v1`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID |

### Admin (`admin/.env.production`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g., `https://api.artnepalaya.com/api/v1`) |

## Authentication Flow

```
Mobile App
  → User taps "Continue with Google"
  → Native Google Sign-In (@react-native-google-signin)
  → Receives Google ID token
  → POST /api/v1/auth/google { idToken, deviceId }
  → Backend verifies with Google OAuth, creates/finds user
  → Returns { user, accessToken, refreshToken, isNewUser }
  → Tokens stored in SecureStore (safe wrappers)
  → If isNewUser → shows 4-step onboarding (Role, About You, Interests, Mature Content)
  → Push token registered via POST /users/me/push-token
```

## Key Features

### Mobile App
- Feed with multi-signal recommendation engine (13 signals, configurable weights)
- Explore with server-side filtering by artwork type + search
- Post creation with multi-media upload (5 images + 1 video)
- Artwork type categorization (admin-managed, dynamic)
- Profile with follow system, metrics, post grid
- Push notifications (FCM + Expo Push Service)
- Deep linking (Android App Links + custom scheme)
- Share pages with Open Graph previews
- Guest mode with limited access
- Real-time notifications via Socket.IO

### Admin Panel
- Dashboard analytics
- User management (verify, ban, suspend)
- Post moderation + soft delete
- Featured content management
- Artwork type management (CRUD + sort order)
- Push notification broadcasting
- Recommendation Engine inspector (feed simulation, score breakdowns)
- CMS pages, global popups, auth media management
- Tag management, search insights

### Backend
- JWT authentication with refresh token rotation
- Multi-signal feed ranking engine (pluggable signal registry)
- Redis caching with wildcard invalidation
- Cloudinary media upload with on-the-fly optimization
- Content moderation (NSFW filtering, soft delete)
- Real-time events (Socket.IO)
- Grouped notification system with push cooldown
- Rate limiting, XSS sanitization, CORS

## Production Deployment

See `RELEASE_CHECKLIST.md` for the full deployment guide.

```bash
# On production server (Ncell Cloud)
cd artnepalaya-monorepo/backend
docker-compose -f docker-compose.prod.yml up -d --build
```

### Production Architecture

```
Internet → Cloudflare DNS
  ├── artnepalaya.com      → Marketing (cPanel, separate server)
  ├── api.artnepalaya.com  → Nginx → Backend (PM2 cluster) + Socket.IO
  ├── admin.artnepalaya.com → Nginx → Admin (static SPA)
  └── app.artnepalaya.com  → Nginx → Backend (share routes)

Backend → MongoDB (internal)
       → Redis (internal)
       → Cloudinary (external CDN)
       → Expo Push Service (external)
```

## Mobile Builds (EAS)

```bash
cd mobile

# Preview APK (for testing)
eas build --profile preview --platform android

# Production AAB (for Play Store)
eas build --profile production --platform android
```

See `mobile/PUSH_NOTIFICATION_SETUP.md` and `mobile/GOOGLE_SIGNIN_SETUP.md` for Firebase/OAuth configuration.

## Database Seeding

```bash
docker exec art_backend npm run seed:all:clear
```

Creates: ~56 users, ~110 posts, reports, featured posts, CMS pages, app configuration.

**Admin credentials:** `admin@artnepalaya.com` / `admin123`

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/google` | Public | Google OAuth login |
| POST | `/auth/refresh` | Public | Refresh JWT tokens |
| GET | `/posts/feed` | Optional | Home feed (recommendation engine) |
| GET | `/posts/explore` | Optional | Explore with artwork type/search filters |
| POST | `/posts` | Required | Create post (multipart upload) |
| GET | `/users/:id` | Public | Public profile (accepts username or ObjectId) |
| POST | `/users/me/push-token` | Required | Register push notification token |
| GET | `/config/artwork-types` | Public | Active artwork types (admin-managed) |
| GET | `/config/featured` | Optional | Featured posts |
| GET | `/notifications` | Required | User notifications (grouped) |
| POST | `/admin/notifications/broadcast` | Admin | Send push to all users |
| GET | `/admin/recommendation/simulate` | Admin | Feed simulation with score breakdown |

## Documentation

| Document | Purpose |
|----------|---------|
| `PRD.md` | Comprehensive product & technical reference (3000+ lines) |
| `ENGINEERING_HANDOFF.md` | Context for new development sessions |
| `RELEASE_CHECKLIST.md` | Production deployment checklist |
| `GOOGLE_OAUTH_MIGRATION.md` | OAuth setup reference (migration complete) |
| `mobile/PUSH_NOTIFICATION_SETUP.md` | FCM + Expo push setup guide |
| `mobile/GOOGLE_SIGNIN_SETUP.md` | Google Sign-In SHA fingerprint guide |
| `mobile/EAS_SETUP.md` | EAS Build configuration |

## Troubleshooting

### Backend won't start
- Check Docker: `docker ps` and `docker logs art_backend --tail 50`
- Verify `.env` has all required variables (Zod validates on startup)
- Ensure MongoDB and Redis containers are healthy

### Mobile can't reach API
- Android Emulator: Use `http://10.0.2.2:8080/api/v1`
- Physical device: Use your machine's LAN IP or production URL
- Check CORS_ORIGIN includes the requesting origin

### Google Sign-In fails
- Verify SHA-1/SHA-256 fingerprints are registered in Firebase Console
- Ensure `google-services.json` matches the Android package name
- Check `GOOGLE_CLIENT_ID` in backend matches the web client ID

### Push notifications not arriving
- Verify FCM server key uploaded to Expo Dashboard
- Check `google-services.json` is at `mobile/google-services.json`
- Ensure notification channel exists (`default` with MAX importance)
- Re-login to force token re-registration

## Contributing

1. Branch from `fix/final-stabilization` (current development branch)
2. Make changes with clear commit messages
3. Update relevant documentation (PRD.md, this README, etc.)
4. Test on real device before marking as complete
5. Push to feature branch and create PR against main

## License

Private — All rights reserved.
