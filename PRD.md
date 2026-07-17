# Art Nepalaya - Product Requirements Document

> **Version:** 2.0  
> **Last Updated:** July 2025  
> **Platform:** Social Art Discovery for Nepali Artists  
> **Status:** MVP Live (Android)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Requirements](#2-product-requirements)
3. [System Architecture](#3-system-architecture)
4. [Folder Structure](#4-folder-structure)
5. [Backend](#5-backend)
6. [Mobile App](#6-mobile-app)
7. [Admin Panel](#7-admin-panel)
8. [Database](#8-database)
9. [API Documentation](#9-api-documentation)
10. [Authentication](#10-authentication)
11. [Media System](#11-media-system)
12. [Notifications](#12-notifications)
13. [Feed Algorithm](#13-feed-algorithm)
14. [Explore Algorithm](#14-explore-algorithm)
15. [Deployment](#15-deployment)
16. [Troubleshooting Guide](#16-troubleshooting-guide)
17. [Feature Map](#17-feature-map)
18. [Technical Debt](#18-technical-debt)
19. [Security](#19-security)
20. [Scaling Strategy](#20-scaling-strategy)
21. [Investor Section](#21-investor-section)

---

## 1. Executive Summary

### 1.1 Vision

Art Nepalaya is Nepal's first dedicated social art discovery platform, connecting Nepali artists with art enthusiasts, collectors, galleries, and businesses. The platform democratizes art exposure by providing every artist -- from emerging talent to established masters -- equal opportunity to showcase their work through an intelligent, algorithm-driven feed system.

### 1.2 Goals

- **Democratize Art Discovery:** Enable artists of all levels to gain visibility through a fair, multi-signal ranking algorithm
- **Build Community:** Connect Nepali artists, art lovers, galleries, and businesses in a purpose-built social network
- **Preserve Culture:** Create a digital archive of Nepali art forms including traditional Thangka, Mandala, Paubha, and contemporary works
- **Enable Commerce:** Provide infrastructure for artists to monetize their work (marketplace roadmap)
- **Mobile-First:** Deliver a premium mobile experience optimized for the Nepali market (Android priority due to 95%+ market share)

### 1.3 Product Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Mobile App | Expo React Native (SDK 50), TypeScript | Primary user interface (Android, iOS planned) |
| Admin Panel | Vite + React + TypeScript | Content moderation, analytics, CMS |
| Backend API | Node.js Express (ES Modules) | RESTful API, real-time events, feed engine |
| Database | MongoDB 7.0 (primary), PostgreSQL 16 (analytics/logs), Redis 7.2 (cache/sessions) |
| Media | Cloudinary | Image/video storage, transformation, CDN delivery |
| Push | Expo Push SDK + FCM | Push notification delivery |
| Real-time | Socket.IO with Redis adapter | Live feed updates, notification counts |
| Hosting | Ncell Cloud VPS (Ubuntu 24.04) | Production infrastructure |

### 1.4 MVP Status

The MVP is **live in production** on Android via Google Play Store with the following capabilities:

- Google Sign-In authentication with phone OTP verification
- Post creation with multi-image/video upload (up to 6 media items)
- Personalized home feed with multi-signal ranking engine
- Explore feed with trending/established/fresh content mix
- Like, save, and follow interactions
- Push notifications (grouped, with cooldowns)
- Real-time Socket.IO updates
- Admin moderation panel with dashboard analytics
- Share pages with deep linking (Android App Links)
- Featured posts curation by admin
- Content reporting system
- NSFW content moderation with blur controls
- CMS for static pages (Terms, Privacy, About)
- Global popup system for announcements
- Tag and artwork type management
- Community waitlist for upcoming features

### 1.5 Roadmap

| Phase | Features | Timeline |
|-------|----------|----------|
| Phase 1 (Complete) | Core social features, feed, admin panel, share pages | Q1-Q2 2025 |
| Phase 2 (In Progress) | Communities, marketplace preview, iOS app | Q3 2025 |
| Phase 3 (Planned) | Marketplace, payments, live events | Q4 2025 |
| Phase 4 (Planned) | AI content moderation, advanced analytics, creator subscriptions | Q1 2026 |

### 1.6 Production URLs

| Service | URL |
|---------|-----|
| API | https://api.artnepalaya.com |
| Admin Panel | https://admin.artnepalaya.com |
| Share/Deep Links | https://app.artnepalaya.com |
| Website | https://artnepalaya.com |

---

## 2. Product Requirements

### 2.1 User App (Mobile)

#### 2.1.1 Authentication
- Google Sign-In (primary authentication method)
- Phone OTP verification (linked to authenticated session)
- Biometric unlock (device-level)
- Auto-refresh tokens (30-day refresh token lifecycle)
- Device-based session management

#### 2.1.2 Onboarding
- Role selection: Artist, Art Lover, Business, Gallery
- Interest selection (artwork types for feed personalization)
- Profile completion (username, bio, avatar)

#### 2.1.3 Home Feed
- Personalized multi-signal ranked feed
- Pull-to-refresh with cache invalidation
- Infinite scroll with cursor-based pagination
- Like/save/share interactions inline
- NSFW blur for opted-out users
- Real-time new post notifications via Socket.IO

#### 2.1.4 Explore
- Algorithm-ranked discover feed (70% trending / 20% established / 10% fresh)
- Artwork type category filters (Mandala, Thangka, Digital Art, etc.)
- User search with username/fullname matching
- Trending tags discovery

#### 2.1.5 Post Creation
- Multi-media upload (up to 6 files: 5 images + 1 video)
- Caption with 2,200 character limit
- Tag selection (trending tags suggested)
- Artwork type categorization
- AI declaration toggle (isAIGenerated)
- Original content declaration
- NSFW self-flagging

#### 2.1.6 Profile
- Public profile view with post grid
- Edit profile (avatar, bio, username, location, website, WhatsApp)
- Followers/following lists
- Saved posts collection
- Username change (tracked with `usernameChangedAt`)

#### 2.1.7 Notifications
- Grouped notifications (e.g., "User1 and 5 others liked your post")
- Like, save, follow, comment notification types
- Admin broadcast notifications
- In-app + push delivery with per-type preferences
- Mark as read (individual + batch)
- Real-time unread count via Socket.IO

#### 2.1.8 Settings
- Notification preferences (push + in-app per type)
- NSFW content toggle
- Account management
- About/Terms/Privacy (CMS-driven)

### 2.2 Admin Panel

#### 2.2.1 Dashboard
- Total users, posts, reports, and engagement metrics
- New registrations trend
- Active users analytics

#### 2.2.2 User Management
- User list with search, filter by role/status
- User status management (active/suspended/banned)
- User verification (artist/gallery/business badges)

#### 2.2.3 Content Moderation
- Post list with soft-delete/restore
- Report queue with status workflow (Pending/Resolved/Dismissed)
- Admin notes on reports
- NSFW post identification

#### 2.2.4 Featured Content
- Curate featured posts with sort ordering
- Set expiration dates on featured items
- Featured content displayed in app carousel

#### 2.2.5 Push Notifications
- Admin broadcast to all users
- Broadcast history with delivery stats
- Push notification config (cooldowns, grouping windows)

#### 2.2.6 CMS
- Editable pages (Terms of Service, Privacy Policy, About)
- Slug-based page system
- Rich text content storage

#### 2.2.7 Configuration
- Auth media management (login screen carousel posts)
- Global popup system (announcements with scheduling)
- Artwork type management (create/edit/toggle/order)
- Tag management (create/edit/delete/merge)
- Feed recommendation weight configuration
- Search insights analytics

### 2.3 Backend API

#### 2.3.1 Design Principles
- RESTful API with consistent JSON response envelope: `{ success, data?, error?, meta? }`
- Zod-validated request bodies/query parameters
- Cursor-based pagination for infinite scroll
- Graceful error handling with typed error codes
- ES Module syntax throughout

#### 2.3.2 Business Rules
- Users cannot like/save their own posts
- Self-follow is prevented
- Banned/suspended users are excluded from all feeds
- Soft-deleted posts are hidden from feeds but recoverable by admin
- NSFW posts require opt-in to view
- Username changes are tracked and limited
- Push notification cooldowns prevent spam (configurable per type)
- Notification grouping within time windows reduces noise
- Feed excludes posts from inactive (banned/suspended) users at query level
- AI-generated posts automatically receive the "ai" tag

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
+-------------------+     +-------------------+     +-------------------+
|   Mobile App      |     |   Admin Panel     |     |  Share Pages      |
|  (Expo/RN/TS)    |     |  (Vite/React/TS)  |     | (Server-rendered) |
+--------+----------+     +--------+----------+     +--------+----------+
         |                          |                          |
         |   HTTPS (JWT Bearer)     |   HTTPS (JWT Bearer)    |   HTTPS (public)
         v                          v                          v
+------------------------------------------------------------------------+
|                         Nginx Reverse Proxy                              |
|                    (SSL termination, routing)                            |
+--------+-------------------+-------------------+-----------------------+
         |                   |                   |
         v                   v                   v
+--------+-------------------+-------------------+-----------------------+
|                         Express Backend (PM2 Cluster)                    |
|  +-------------+  +-------------+  +-------------+  +-------------+    |
|  | Auth Module |  | Post Module |  | Admin Module|  | Share Module|    |
|  +------+------+  +------+------+  +------+------+  +------+------+   |
|         |                |                |                |            |
|  +------+----------------+----------------+----------------+------+    |
|  |                    Shared Middleware Layer                      |    |
|  |  (authGuard, security, upload, validator, errorHandler)        |    |
|  +------+----------------+----------------+----------------+------+    |
|         |                |                |                |            |
|  +------v------+  +------v------+  +------v------+  +-----v-------+   |
|  |  MongoDB    |  | PostgreSQL  |  |   Redis     |  | Cloudinary  |   |
|  | (Primary DB)|  | (Analytics) |  | (Cache/Pub) |  | (Media CDN) |   |
|  +-------------+  +-------------+  +-------------+  +-------------+   |
+------------------------------------------------------------------------+
         |
         v
+--------+----------+
|    Socket.IO      |
| (Redis Adapter)   |
+-------------------+
```

### 3.2 Request Lifecycle

```
1. Client sends HTTPS request
2. Nginx terminates SSL, proxies to Express (port 8080)
3. Express middleware chain:
   a. Request logging (method + URL)
   b. Helmet security headers
   c. CORS validation
   d. Mongo sanitize (query injection prevention)
   e. XSS sanitize (HTML tag stripping)
   f. Rate limiting (200 req/15min on /api/ routes)
   g. Body parsing (JSON limit: 50KB)
4. Route matching
5. Auth middleware (authGuard or optionalAuth)
6. Zod validation middleware
7. Controller (request/response handling)
8. Service layer (business logic)
9. Model layer (database operations)
10. Response envelope: { success: true, data: {...} }
11. Global error handler catches unhandled errors
```

### 3.3 Authentication Flow

```
+----------+     +----------+     +----------+     +----------+
|  Mobile  | --> |  Google  | --> | Backend  | --> |  Redis   |
|   App    |     |  OAuth   |     |   API    |     | Sessions |
+----------+     +----------+     +----------+     +----------+
     |                                  |
     | 1. Google Sign-In (idToken)      |
     |--------------------------------->|
     |                                  | 2. Verify with google-auth-library
     |                                  |    (supports web + Android + iOS audiences)
     |                                  |
     |                                  | 3. Find or create User in MongoDB
     |                                  |
     |                                  | 4. Generate JWT access (15min) + refresh (30d)
     |                                  |
     |                                  | 5. Store refresh in Redis: auth:refresh:{userId}:{deviceId}
     |  6. Return { user, accessToken,  |
     |     refreshToken, isNewUser }    |
     |<---------------------------------|
     |                                  |
     | 7. Subsequent requests with      |
     |    Authorization: Bearer <access>|
     |--------------------------------->|
     |                                  | 8. jwt.verify -> User lookup -> req.user
```

### 3.4 Media Upload Flow

```
+----------+     +----------+     +----------+     +----------+
|  Mobile  | --> | Backend  | --> |Cloudinary| --> | MongoDB  |
|   App    |     | (Multer) |     |   API    |     |  (Post)  |
+----------+     +----------+     +----------+     +----------+
     |                  |                |                |
     | 1. multipart/form-data           |                |
     |  (media files + body fields)     |                |
     |----------------->|               |                |
     |                  | 2. Multer stores in memory      |
     |                  |    (max 6 files, 100MB each)   |
     |                  |               |                |
     |                  | 3. Upload buffer to Cloudinary  |
     |                  |    resource_type: auto          |
     |                  |-------------->|                |
     |                  |               |                |
     |                  | 4. Receive { url, public_id }  |
     |                  |<--------------|                |
     |                  |               |                |
     |                  | 5. Create Post document         |
     |                  |    media: [{url, providerId,   |
     |                  |             type}]             |
     |                  |------------------------------>|
     |                  |               |                |
     | 6. Return populated post         |                |
     |<-----------------|               |                |
```

### 3.5 Notification Flow

```
+----------+     +----------+     +----------+     +----------+
|  Action  | --> | Notif    | --> |  Push    | --> |  Mobile  |
| (like)   |     | Service  |     | Service  |     |   App    |
+----------+     +----------+     +----------+     +----------+
     |                  |                |                |
     | 1. Interaction triggers          |                |
     |    createNotification()          |                |
     |----------------->|               |                |
     |                  | 2. Check preferences           |
     |                  |    (inApp + push per type)     |
     |                  |               |                |
     |                  | 3. Find/create NotificationGroup
     |                  |    (increment actorCount)      |
     |                  |               |                |
     |                  | 4. Check push cooldown         |
     |                  |    (lastPushSentAt + cooldown) |
     |                  |               |                |
     |                  | 5. If cooldown passed:         |
     |                  |    pushService.send()          |
     |                  |-------------->|                |
     |                  |               | 6. Expo.chunkPushNotifications
     |                  |               |    sendPushNotificationsAsync
     |                  |               |--------------->|
     |                  |               |                |
     |                  | 7. Socket.IO emit to           |
     |                  |    user:{recipientId} room     |
     |                  |------------------------------>|
     |                  |    (NOTIFICATION_COUNT_CHANGED)|
```

### 3.6 Feed Flow

```
+----------+     +----------+     +----------+     +----------+
|  Mobile  | --> | Post     | --> | Ranking  | --> | MongoDB  |
|   App    |     | Service  |     | Engine   |     |  (Posts) |
+----------+     +----------+     +----------+     +----------+
     |                  |                |                |
     | GET /api/v1/posts/feed           |                |
     |----------------->|               |                |
     |                  | 1. buildRecommendedFeed(userId) |
     |                  |-------------->|                |
     |                  |               | 2. getUserFeedSignals
     |                  |               |    (user.interests)
     |                  |               |                |
     |                  |               | 3. getRecommendationWeights
     |                  |               |    (AppConfig or defaults)
     |                  |               |                |
     |                  |               | 4. Fetch 3x limit candidates
     |                  |               |    (sorted by _id desc)
     |                  |               |--------------->|
     |                  |               |                |
     |                  |               | 5. Build scoring context
     |                  |               |    (creatorQuality, postCounts)
     |                  |               |                |
     |                  |               | 6. Score all posts via
     |                  |               |    signal registry (13 signals)
     |                  |               |                |
     |                  |               | 7. Sort by composite score
     |                  |               |                |
     |                  |               | 8. Split: 90% main + 10% exploration
     |                  |               |                |
     |                  |               | 9. Apply diversity (no consecutive
     |                  |               |    same-creator posts)
     |                  |               |                |
     |                  | 10. Hydrate isLikedByMe/isSavedByMe
     |                  |               |                |
     | 11. Return { data, meta: {nextCursor, hasNextPage} }
     |<-----------------|               |                |
```

---

## 4. Folder Structure

### 4.1 Root Level

```
artnepalaya-monorepo/
|-- backend/              # Node.js Express API server
|-- mobile/               # Expo React Native mobile app
|-- admin/                # Vite React TypeScript admin panel
|-- PRD.md                # This document
|-- .agents/              # AI agent task tracking
```

### 4.2 Backend Structure

```
backend/
|-- src/
|   |-- app.js                    # Express app configuration (middleware, routes)
|   |-- server.js                 # HTTP server startup, DB connections, Socket.IO init
|   |-- config/
|   |   |-- env.js                # Zod-validated environment variables
|   |   |-- cloudinary.js         # Cloudinary SDK initialization
|   |-- middlewares/
|   |   |-- authGuard.js          # JWT verification + user status check
|   |   |-- optionalAuth.js       # Optional JWT (passes through if no token)
|   |   |-- roleGuard.js          # Role-based access control (requireRole(['Admin']))
|   |   |-- security.js           # Helmet, CORS, rate-limit, mongo-sanitize, XSS
|   |   |-- upload.js             # Multer memory storage (fileFilter, limits)
|   |   |-- validator.js          # Zod schema validation middleware
|   |   |-- errorHandler.js       # Global error handler (Zod, Mongo 11000, custom)
|   |-- modules/
|   |   |-- admin/                # Admin dashboard, config, CMS, featured, moderation
|   |   |   |-- admin.controller.js
|   |   |   |-- admin.routes.js
|   |   |   |-- admin.validation.js
|   |   |   |-- appConfig.model.js      # Key-value config (Mixed type)
|   |   |   |-- artworkType.model.js    # Artwork type categories
|   |   |   |-- cmsPage.model.js        # CMS content pages
|   |   |   |-- config.routes.js        # Public config endpoints
|   |   |   |-- featured.model.js       # Featured post curation
|   |   |   |-- globalPopup.model.js    # Announcement popups
|   |   |-- auth/                 # Google OAuth, JWT, OTP, refresh tokens
|   |   |   |-- auth.controller.js
|   |   |   |-- auth.routes.js
|   |   |   |-- auth.service.js         # Token generation, Google verify, OTP
|   |   |   |-- auth.validation.js
|   |   |-- community/            # Community waitlist and interest registration
|   |   |   |-- community.controller.js
|   |   |   |-- community.model.js
|   |   |   |-- community.routes.js
|   |   |-- interactions/         # (Reserved for future comment system)
|   |   |-- notifications/        # Push, grouped notifications, broadcasts
|   |   |   |-- notification.controller.js
|   |   |   |-- notification.model.js        # Legacy flat notifications
|   |   |   |-- notificationGroup.model.js   # Grouped notification aggregates
|   |   |   |-- notification.service.js      # Create, group, push delivery
|   |   |   |-- notification.routes.js
|   |   |   |-- notification.validation.js
|   |   |   |-- notificationConfig.js        # Push cooldown/grouping config
|   |   |   |-- broadcastLog.model.js        # Admin broadcast tracking
|   |   |-- posts/                # Post CRUD, feed, explore, recommendation engine
|   |   |   |-- post.controller.js
|   |   |   |-- post.model.js               # Post schema with media[], metrics
|   |   |   |-- post-interaction.model.js   # Like + Save (compound unique)
|   |   |   |-- post.routes.js
|   |   |   |-- post.service.js             # Business logic, feed building
|   |   |   |-- post.validation.js          # Zod schemas for create/update/feed
|   |   |   |-- recommendation.service.js   # Multi-signal ranking engine
|   |   |-- reports/              # Content reporting system
|   |   |   |-- report.model.js
|   |   |   |-- report.routes.js
|   |   |   |-- report.controller.js
|   |   |-- share/                # Server-rendered share landing pages
|   |   |   |-- share.routes.js           # /p/:postId, /u/:username, /c/:id, /e/:id, /m/:id
|   |   |-- tags/                 # Tag search and trending
|   |   |   |-- tag.model.js
|   |   |   |-- tag.controller.js
|   |   |   |-- tag.routes.js
|   |   |   |-- tag.service.js
|   |   |   |-- tag.validation.js
|   |   |-- taxonomy/             # (Reserved for hierarchical categorization)
|   |   |-- users/                # User profiles, follow system, search
|   |       |-- user.controller.js
|   |       |-- user.model.js            # User schema (roles, preferences, stats)
|   |       |-- user.routes.js
|   |       |-- user.service.js
|   |       |-- user.validation.js
|   |       |-- follow.model.js          # Follow relationships
|   |-- realtime/
|   |   |-- socketServer.js       # Socket.IO server with Redis adapter
|   |   |-- emitter.js            # Utility: emitToFeed(), emitToUser()
|   |   |-- events.js             # Event constants (post.created, follow.created, etc.)
|   |-- scripts/
|   |   |-- seedAll.js            # Database seeding orchestrator
|   |   |-- seed.js               # Seed data definitions
|   |   |-- migrateNotifications.js  # Migration: flat -> grouped notifications
|   |-- shared/
|       |-- utils/
|       |   |-- cache.js          # Redis get/set cache with TTL + invalidation
|       |   |-- userFilters.js    # Get banned/suspended user IDs for feed filtering
|       |   |-- apiResponse.js    # Response envelope helpers
|       |   |-- pushNotifications.js  # (Legacy, replaced by pushService.js)
|       |-- services/
|           |-- pushService.js    # Expo Push SDK wrapper (chunk, send, receipt check)
|-- docker-compose.yml            # Development multi-service setup
|-- docker-compose.prod.yml       # Production deployment configuration
|-- Dockerfile                    # Backend development container
|-- Dockerfile.prod               # Production container (PM2 cluster mode)
|-- nginx/
|   |-- nginx.conf                # Development Nginx configuration
|   |-- nginx.prod.conf           # Production Nginx (HTTPS, SSL)
|   |-- certs/                    # SSL certificates (fullchain.pem, privkey.pem)
|-- package.json
|-- .env.development
|-- .env.production
```

### 4.3 Mobile Structure

```
mobile/
|-- src/
|   |-- components/              # Reusable UI components
|   |-- config/                  # App configuration constants
|   |-- navigation/
|   |   |-- RootNavigator.tsx    # Root: AuthStack | AppStack based on auth state
|   |   |-- AuthStack.tsx        # Login, onboarding screens
|   |   |-- AppStack.tsx         # Main app navigation wrapper
|   |   |-- MainTabs.tsx         # Bottom tab navigator (Home, Explore, Create, Profile)
|   |-- screens/
|   |   |-- auth/                # Login, phone verification
|   |   |-- home/                # Home feed screen
|   |   |-- explore/             # Explore/discover screen
|   |   |-- create/              # Post creation flow
|   |   |-- profile/             # User profile, edit profile
|   |   |-- notifications/       # Notification list
|   |   |-- community/           # Community features
|   |   |-- marketplace/         # (Future) marketplace screens
|   |   |-- onboarding/          # Role/interest selection
|   |   |-- post/                # Single post detail view
|   |   |-- settings/            # App settings
|   |-- services/
|   |   |-- api.ts               # Axios instance with interceptors (auto-refresh)
|   |   |-- auth.service.ts      # Google Sign-In, token management
|   |   |-- post.service.ts      # Post CRUD, feed, explore API calls
|   |   |-- user.service.ts      # Profile, follow, search API calls
|   |   |-- notification.service.ts  # Notification fetch, mark read
|   |   |-- socket.service.ts    # Socket.IO client connection management
|   |   |-- pushNotification.service.ts  # Expo push token registration
|   |   |-- community.service.ts # Community API calls
|   |   |-- config.service.ts    # App config (artwork types, featured, popups)
|   |-- store/
|   |   |-- slices/
|   |   |   |-- authSlice.ts     # Auth state (user, tokens, isAuthenticated)
|   |   |   |-- feedSlice.ts     # Feed state (posts, pagination, loading)
|   |   |   |-- notificationSlice.ts  # Notification state (items, unread count)
|   |   |   |-- userSlice.ts     # User profile state
|   |   |   |-- appSlice.ts      # App-level state (config, popups)
|   |-- theme/                   # Design tokens (colors, typography, spacing)
|   |-- utils/                   # Helper utilities
|-- app.json                     # Expo configuration
|-- package.json
```

### 4.4 Admin Structure

```
admin/
|-- src/
|   |-- components/              # Shared UI components (Layout, Sidebar, etc.)
|   |-- pages/
|   |   |-- Dashboard.tsx        # Analytics overview with charts
|   |   |-- Users.tsx            # User management table
|   |   |-- Posts.tsx            # Post moderation list
|   |   |-- Featured.tsx         # Featured content curation
|   |   |-- Moderation.tsx       # Report queue management
|   |   |-- PushNotifications.tsx  # Broadcast send + history
|   |   |-- CmsEditor.tsx        # CMS page editor
|   |   |-- TagManagement.tsx    # Tag CRUD + merge
|   |   |-- ArtworkTypes.tsx     # Artwork type management
|   |   |-- SearchInsights.tsx   # Search query analytics
|   |   |-- GlobalPopup.tsx      # Popup announcement manager
|   |   |-- CommunityInterest.tsx  # Community interest registrations
|   |   |-- AuthMedia.tsx        # Login carousel management
|   |   |-- Login.tsx            # Admin login (email/password)
|   |-- services/                # API service layer
|   |-- store/                   # State management
|   |-- assets/                  # Static assets
|-- Dockerfile                   # Multi-stage build (build + nginx serve)
|-- vite.config.ts
|-- package.json
```

---

## 5. Backend

### 5.1 Module Architecture

Every backend module follows the **Controller-Service-Model** pattern:

```
module/
|-- module.controller.js   # HTTP request handling, response formatting
|-- module.service.js      # Business logic, database operations
|-- module.model.js        # Mongoose schema definition
|-- module.routes.js       # Express Router with middleware chain
|-- module.validation.js   # Zod schemas for request validation
```

### 5.2 Modules

| Module | Path | Purpose |
|--------|------|---------|
| Admin | `backend/src/modules/admin/` | Dashboard stats, user/post management, CMS, featured, config, broadcasts |
| Auth | `backend/src/modules/auth/` | Google OAuth, JWT tokens, OTP phone verification, refresh, logout |
| Community | `backend/src/modules/community/` | Waitlist registration, community interest tracking |
| Interactions | `backend/src/modules/interactions/` | Reserved for future comment/reaction system |
| Notifications | `backend/src/modules/notifications/` | Grouped notifications, push delivery, broadcast |
| Posts | `backend/src/modules/posts/` | Post CRUD, feed algorithm, explore, like/save, recommendation engine |
| Reports | `backend/src/modules/reports/` | Content/user reporting with admin resolution workflow |
| Share | `backend/src/modules/share/` | Server-rendered HTML landing pages for deep links |
| Tags | `backend/src/modules/tags/` | Tag search, trending calculation, usage tracking |
| Taxonomy | `backend/src/modules/taxonomy/` | Reserved for hierarchical art categorization |
| Users | `backend/src/modules/users/` | Profile CRUD, follow system, avatar upload, search, push tokens |

### 5.3 Middleware Stack

File: `backend/src/middlewares/`

| Middleware | File | Purpose |
|-----------|------|---------|
| `authGuard` | `authGuard.js` | Verifies JWT Bearer token, loads user role/status, blocks banned users |
| `optionalAuth` | `optionalAuth.js` | Attempts JWT verification but passes through if no token (for guest access) |
| `requireRole` | `roleGuard.js` | Checks `req.user.role` against allowed roles array (e.g., `['Admin']`) |
| `applySecurityMiddlewares` | `security.js` | Applies Helmet, CORS, mongo-sanitize, XSS sanitize, rate-limit |
| `secureUpload` | `upload.js` | Multer with memory storage, file type filter (images + videos), 6 file limit |
| `handleUploadErrors` | `upload.js` | Translates Multer errors to user-friendly messages |
| `validate` | `validator.js` | Zod schema validation for req.body, req.query, req.params |
| `globalErrorHandler` | `errorHandler.js` | Catches all unhandled errors: Zod, Mongo 11000, custom status, 500 fallback |

### 5.4 Middleware Execution Order

Defined in `backend/src/app.js`:

1. Request logging (`[REQUEST] METHOD /path`)
2. Trust proxy (`app.set('trust proxy', 1)`)
3. Security middlewares (Helmet, CORS, mongo-sanitize, XSS, CSP for API routes, rate-limit)
4. Body parsing (JSON 50KB limit, URL-encoded 50KB limit)
5. Health check endpoint (`GET /health`)
6. Android App Links (`GET /.well-known/assetlinks.json`)
7. Share landing pages (mounted at `/`)
8. API routes (mounted at `/api/v1/*`)
9. Global error handler

### 5.5 Validation Layer

All request validation uses **Zod schemas** via the `validate()` middleware:

```javascript
// Example from post.validation.js
export const createPostSchema = z.object({
  body: z.object({
    caption: z.string().max(2200).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    artworkType: z.union([z.string(), z.array(z.string())]).optional(),
    isHumanMade: z.union([z.boolean(), z.string()]),
    isAIGenerated: z.union([z.boolean(), z.string()]).optional(),
    isOriginalContent: z.union([z.boolean(), z.string()]).optional(),
    isNsfw: z.union([z.boolean(), z.string()]).optional(),
  })
});
```

The validator middleware supports `body`, `query`, and `params` validation targets. Form-data fields arrive as strings, so schemas use `z.union([z.boolean(), z.string()])` for boolean fields.

### 5.6 Socket.IO Events

Defined in `backend/src/realtime/events.js`:

| Event | Constant | Trigger | Room |
|-------|----------|---------|------|
| `post.created` | `EVENTS.POST_CREATED` | New post published | `feed` |
| `post.updated` | `EVENTS.POST_UPDATED` | Post edited | `feed` |
| `post.deleted` | `EVENTS.POST_DELETED` | Post soft-deleted | `feed` |
| `follow.created` | `EVENTS.FOLLOW_CREATED` | New follow | `user:{userId}` |
| `follow.deleted` | `EVENTS.FOLLOW_DELETED` | Unfollow | `user:{userId}` |
| `notification.count.changed` | `EVENTS.NOTIFICATION_COUNT_CHANGED` | New notification | `user:{recipientId}` |
| `notification.updated` | `EVENTS.NOTIFICATION_UPDATED` | Group updated | `user:{recipientId}` |

### 5.7 Socket.IO Server Configuration

File: `backend/src/realtime/socketServer.js`

- Uses `@socket.io/redis-adapter` for multi-instance pub/sub
- JWT authentication in handshake middleware (`socket.handshake.auth.token`)
- Auto-joins rooms: `user:{userId}` (personal) and `feed` (global)
- CORS: `origin: '*'` (production should restrict)

### 5.8 Emitter Utilities

File: `backend/src/realtime/emitter.js`

```javascript
emitToFeed(eventName, payload)   // Emits to all users in 'feed' room
emitToUser(userId, eventName, payload)  // Emits to specific user's room
```

---

## 6. Mobile App

### 6.1 Technology Stack

- **Framework:** Expo SDK 50 with React Native
- **Language:** TypeScript
- **State Management:** Redux Toolkit with slices
- **Navigation:** React Navigation (stack + tab navigators)
- **HTTP Client:** Axios with JWT interceptor (auto-refresh on 401)
- **Real-time:** Socket.IO client
- **Push:** Expo Notifications + FCM
- **Auth:** Expo AuthSession (Google Sign-In)

### 6.2 Navigation Architecture

File: `mobile/src/navigation/`

```
RootNavigator.tsx
|-- (if not authenticated)
|   |-- AuthStack.tsx
|       |-- LoginScreen
|       |-- PhoneVerificationScreen
|       |-- OnboardingScreens (role, interests, profile)
|-- (if authenticated)
    |-- AppStack.tsx
        |-- MainTabs.tsx
        |   |-- HomeTab (Feed)
        |   |-- ExploreTab
        |   |-- CreateTab (Post creation)
        |   |-- ProfileTab
        |-- NotificationsScreen
        |-- PostDetailScreen
        |-- UserProfileScreen
        |-- SettingsScreen
        |-- EditProfileScreen
        |-- FollowersScreen
        |-- FollowingScreen
        |-- SavedPostsScreen
        |-- CommunityScreen
```

### 6.3 Screens

| Directory | Screens | Purpose |
|-----------|---------|---------|
| `screens/auth/` | Login, PhoneVerify | Google Sign-In, OTP verification |
| `screens/home/` | HomeFeed | Personalized feed with infinite scroll |
| `screens/explore/` | Explore | Discovery feed with category filters |
| `screens/create/` | CreatePost | Media picker, caption, tags, artwork type |
| `screens/profile/` | Profile, EditProfile | View/edit user profile |
| `screens/notifications/` | NotificationList | Grouped notifications with mark-read |
| `screens/community/` | Community | Community features, waitlist |
| `screens/marketplace/` | Marketplace | (Future) artwork listings |
| `screens/onboarding/` | Role, Interests, ProfileSetup | New user flow |
| `screens/post/` | PostDetail | Single post with full interactions |
| `screens/settings/` | Settings, Preferences | App configuration |

### 6.4 Services Layer

File: `mobile/src/services/`

| Service | File | Purpose |
|---------|------|---------|
| API Client | `api.ts` | Axios instance with baseURL, JWT interceptor, auto-refresh on 401 |
| Auth | `auth.service.ts` | Google Sign-In flow, token storage (SecureStore), logout |
| Posts | `post.service.ts` | Feed fetch, explore, create/edit/delete, like/save |
| Users | `user.service.ts` | Profile CRUD, follow/unfollow, search, avatar upload |
| Notifications | `notification.service.ts` | Fetch notifications, mark read, unread count |
| Socket | `socket.service.ts` | Socket.IO connection management, event listeners |
| Push | `pushNotification.service.ts` | Expo token registration, permission request |
| Community | `community.service.ts` | Waitlist join, community interest |
| Config | `config.service.ts` | App config (artwork types, featured, CMS, popups) |

### 6.5 State Management (Redux Toolkit)

File: `mobile/src/store/slices/`

| Slice | State Shape | Purpose |
|-------|-------------|---------|
| `authSlice` | `{ user, accessToken, refreshToken, isAuthenticated, isNewUser }` | Auth lifecycle |
| `feedSlice` | `{ posts[], cursor, hasNextPage, isLoading, isRefreshing }` | Home feed pagination |
| `notificationSlice` | `{ items[], unreadCount, isLoading }` | Notifications with real-time count |
| `userSlice` | `{ profile, isLoading }` | Current user profile cache |
| `appSlice` | `{ config, popup, artworkTypes[] }` | App-level configuration |

### 6.6 API Client Architecture

The Axios instance (`api.ts`) implements:

1. **Base URL:** Points to `https://api.artnepalaya.com/api/v1`
2. **Request Interceptor:** Attaches `Authorization: Bearer <accessToken>` header
3. **Response Interceptor:** On 401, queues the request, calls `/auth/refresh`, retries with new token
4. **Device ID:** Sends `X-Device-Id` header for session-per-device management
5. **Error Normalization:** Transforms API error responses into consistent format

### 6.7 Push Notification Flow

1. On app launch, request notification permissions via `Notifications.requestPermissionsAsync()`
2. Get Expo push token: `Notifications.getExpoPushTokenAsync()`
3. Register token with backend: `POST /api/v1/users/me/push-token`
4. Handle incoming notifications via `Notifications.addNotificationReceivedListener()`
5. Handle notification tap via `Notifications.addNotificationResponseReceivedListener()`
6. Navigate to relevant screen based on notification data payload

### 6.8 Deep Linking

The mobile app handles deep links with the scheme `artnepalaya://`:

| Pattern | Screen | Example |
|---------|--------|---------|
| `artnepalaya://p/:postId` | PostDetail | View specific artwork |
| `artnepalaya://u/:username` | UserProfile | View artist profile |
| `artnepalaya://c/:id` | Community | View community |
| `artnepalaya://e/:id` | Event | View event |
| `artnepalaya://m/:id` | Marketplace | View listing |

Android App Links are verified via `/.well-known/assetlinks.json` served by the backend.

---

## 7. Admin Panel

### 7.1 Technology Stack

- **Build Tool:** Vite
- **Framework:** React 18 with TypeScript
- **Routing:** React Router
- **State:** Context API / Zustand
- **HTTP:** Axios with admin JWT
- **UI:** Custom components (dark theme)

### 7.2 Authentication

Admin login uses a separate email/password flow:
- Endpoint: `POST /api/v1/auth/admin-login`
- Password hashed with bcrypt (stored in `User.passwordHash`)
- Requires `role: 'Admin'` in User document
- Returns same JWT structure as mobile auth

### 7.3 Pages

| Page | File | Features |
|------|------|----------|
| **Dashboard** | `Dashboard.tsx` | User count, post count, report count, engagement metrics, registration trends |
| **Users** | `Users.tsx` | Paginated user table, role/status filter, suspend/ban actions, verification badges |
| **Posts** | `Posts.tsx` | Post grid/list, soft-delete/restore, NSFW flagging |
| **Featured** | `Featured.tsx` | Curate featured posts, drag-to-reorder, set expiry dates |
| **Moderation** | `Moderation.tsx` | Report queue, status workflow (Pending -> Resolved/Dismissed), admin notes |
| **Push Notifications** | `PushNotifications.tsx` | Compose broadcasts, view delivery history with stats |
| **CMS Editor** | `CmsEditor.tsx` | Edit Terms, Privacy, About pages (slug-based) |
| **Tag Management** | `TagManagement.tsx` | Create/edit/delete tags, merge duplicate tags |
| **Artwork Types** | `ArtworkTypes.tsx` | Manage categories (name, icon, sort order, active toggle) |
| **Search Insights** | `SearchInsights.tsx` | View top search queries, frequency, zero-result queries |
| **Global Popup** | `GlobalPopup.tsx` | Create/schedule/archive announcement popups |
| **Community Interest** | `CommunityInterest.tsx` | View community interest registrations, analytics |
| **Auth Media** | `AuthMedia.tsx` | Manage login screen background carousel (select posts) |
| **Login** | `Login.tsx` | Admin email/password authentication |

### 7.4 Admin API Endpoints Used

All admin routes require `authGuard` + `requireRole(['Admin'])`:

```
GET    /api/v1/admin/dashboard          # Dashboard metrics
GET    /api/v1/admin/analytics           # Detailed analytics
GET    /api/v1/admin/users               # User list (paginated)
PUT    /api/v1/admin/users/:userId/status  # Change user status
PUT    /api/v1/admin/users/:userId/verify  # Verify user
PUT    /api/v1/admin/users/:userId/unverify  # Remove verification
GET    /api/v1/admin/posts               # Post list
PUT    /api/v1/admin/posts/:postId/trash  # Soft-delete post
PUT    /api/v1/admin/posts/:postId/restore  # Restore post
DELETE /api/v1/admin/posts/:postId        # Hard-delete post
GET    /api/v1/admin/featured            # Get featured posts
POST   /api/v1/admin/featured            # Add featured post
DELETE /api/v1/admin/featured/:postId     # Remove featured
PUT    /api/v1/admin/featured/:postId/order  # Update sort order
PUT    /api/v1/admin/featured/:postId/expiry  # Set expiry date
GET    /api/v1/admin/reports             # Report queue
PUT    /api/v1/admin/reports/:reportId/resolve  # Resolve report
PUT    /api/v1/admin/reports/:reportId/notes  # Add admin notes
POST   /api/v1/admin/notifications/broadcast  # Send broadcast
GET    /api/v1/admin/notifications/history  # Broadcast history
GET    /api/v1/admin/notifications/config  # Notification settings
PUT    /api/v1/admin/notifications/config  # Update notification settings
GET    /api/v1/admin/cms/:slug           # Get CMS page
PUT    /api/v1/admin/cms/:slug           # Update CMS page
GET    /api/v1/admin/config/auth-media   # Get auth carousel config
PUT    /api/v1/admin/config/auth-media   # Update auth carousel
GET    /api/v1/admin/global-popup        # Get active popup
POST   /api/v1/admin/global-popup        # Create popup
PUT    /api/v1/admin/global-popup/:id    # Update popup
PUT    /api/v1/admin/global-popup/:id/archive  # Archive popup
GET    /api/v1/admin/artwork-types       # List artwork types
POST   /api/v1/admin/artwork-types       # Create artwork type
PUT    /api/v1/admin/artwork-types/:id   # Update artwork type
PATCH  /api/v1/admin/artwork-types/:id/toggle  # Toggle active
GET    /api/v1/admin/tags                # List tags
POST   /api/v1/admin/tags                # Create tag
PUT    /api/v1/admin/tags/:id            # Update tag
DELETE /api/v1/admin/tags/:id            # Delete tag
POST   /api/v1/admin/tags/merge          # Merge tags
GET    /api/v1/admin/feed-analytics      # Feed algorithm stats
GET    /api/v1/admin/search-insights     # Search analytics
GET    /api/v1/admin/push-stats          # Push delivery metrics
GET    /api/v1/admin/community-interest  # Interest registrations
GET    /api/v1/admin/community-interest/analytics  # Interest analytics
```

### 7.5 Deployment

The admin panel is built as a static site and served via Nginx:
- Multi-stage Docker build: `npm run build` (Vite) then serve with `nginx:alpine`
- Routes to `https://admin.artnepalaya.com`
- All client-side routes fallback to `index.html` (SPA routing)

---

## 8. Database

### 8.1 MongoDB (Primary Database)

MongoDB 7.0 serves as the primary data store for all application data.

#### 8.1.1 Collections & Schemas

**Users Collection** (`users`)  
File: `backend/src/modules/users/user.model.js`

| Field | Type | Description |
|-------|------|-------------|
| `googleId` | String (unique, sparse) | Google OAuth identifier |
| `email` | String (unique, sparse, lowercase) | User email (optional for OTP-only users) |
| `phoneNumber` | String (unique, sparse) | Verified phone number |
| `username` | String (unique, sparse) | Display username |
| `usernameChangedAt` | Date | Tracks last username change |
| `fullName` | String | Display name |
| `avatarUrl` | String | Cloudinary avatar URL |
| `passwordHash` | String (select: false) | Admin password (bcrypt) |
| `dob` | Date | Date of birth |
| `isAdult` | Boolean | Computed from dob (pre-save hook) |
| `role` | Enum: Artist, Art Lover, Business, Gallery, Admin, null | User role |
| `subRoles` | [String] | Additional role tags |
| `interests` | [String] | Artwork type preferences (feeds ranking) |
| `stats.followers` | Number | Follower count (denormalized) |
| `stats.following` | Number | Following count (denormalized) |
| `status` | Enum: active, suspended, banned | Account status |
| `bio` | String (max 300) | Profile biography |
| `location` | String (max 100) | User location |
| `website` | String (max 200) | Personal website |
| `whatsapp` | String (max 200) | WhatsApp contact |
| `contactPhone` | String (max 50) | Contact phone |
| `nsfwBlurEnabled` | Boolean | NSFW blur preference |
| `showMatureContent` | Boolean | Allow mature content in feed |
| `pushTokens` | [String] | Expo push notification tokens |
| `notificationPreferences.push.*` | Boolean per type | Push preferences (like, save, follow, comment, adminBroadcast) |
| `notificationPreferences.inApp.*` | Boolean per type | In-app preferences |
| `isVerified` | Boolean | Verification badge status |
| `verifiedType` | Enum: artist, gallery, business, null | Verification category |
| `createdAt` / `updatedAt` | Date | Timestamps |

Indexes: `{ role: 1 }`, `{ status: 1 }`

---

**Posts Collection** (`posts`)  
File: `backend/src/modules/posts/post.model.js`

| Field | Type | Description |
|-------|------|-------------|
| `authorId` | ObjectId (ref: User) | Post author |
| `media` | [{url, providerId, type}] | Cloudinary media items |
| `media[].url` | String | CDN URL |
| `media[].providerId` | String | Cloudinary public_id |
| `media[].type` | Enum: image, video | Media type |
| `caption` | String (max 2200) | Post caption |
| `tags` | [String] | Lowercase tag strings |
| `artworkType` | [String] | Artwork category labels |
| `isHumanMade` | Boolean (required) | Human-created flag (legacy) |
| `isOriginalContent` | Boolean | Original content declaration |
| `isAIGenerated` | Boolean | AI-generated/assisted flag |
| `isNsfw` | Boolean | Mature content flag |
| `deletedAt` | Date (null = active) | Soft-delete timestamp |
| `likesCount` | Number | Denormalized like count |
| `savesCount` | Number | Denormalized save count |
| `createdAt` / `updatedAt` | Date | Timestamps |

Indexes: `{ authorId: 1, _id: -1 }`, `{ tags: 1 }`, `{ artworkType: 1 }`

---

**Likes Collection** (`likes`)  
File: `backend/src/modules/posts/post-interaction.model.js`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId (ref: User) | User who liked |
| `postId` | ObjectId (ref: Post) | Liked post |
| `createdAt` / `updatedAt` | Date | Timestamps |

Indexes: `{ userId: 1, postId: 1 }` (unique compound)

---

**Saves Collection** (`saves`)  
File: `backend/src/modules/posts/post-interaction.model.js`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId (ref: User) | User who saved |
| `postId` | ObjectId (ref: Post) | Saved post |
| `createdAt` / `updatedAt` | Date | Timestamps |

Indexes: `{ userId: 1, postId: 1 }` (unique compound)

---

**Follows Collection** (`follows`)  
File: `backend/src/modules/users/follow.model.js`

| Field | Type | Description |
|-------|------|-------------|
| `followerId` | ObjectId (ref: User) | User performing the follow |
| `followingId` | ObjectId (ref: User) | User being followed |
| `createdAt` / `updatedAt` | Date | Timestamps |

Indexes: `{ followerId: 1, followingId: 1 }` (unique compound)

---

**NotificationGroups Collection** (`notificationgroups`)  
File: `backend/src/modules/notifications/notificationGroup.model.js`

| Field | Type | Description |
|-------|------|-------------|
| `recipientId` | ObjectId (ref: User) | Notification recipient |
| `type` | Enum (14 types) | Notification category |
| `targetType` | Enum: Post, User, System | Related entity type |
| `targetId` | ObjectId | Related entity ID |
| `actorCount` | Number | Number of actors (e.g., "5 people liked") |
| `recentActors` | [ObjectId] (ref: User) | Last few actors for display |
| `latestActivityAt` | Date | Last activity timestamp |
| `isRead` | Boolean | Read status |
| `lastPushSentAt` | Date | Push cooldown tracking |
| `groupCreatedAt` | Date | When group was created |
| `title` | String | Push notification title |
| `message` | String | Push notification body |

Indexes: `{ recipientId: 1, latestActivityAt: -1 }`, `{ recipientId: 1, isRead: 1 }`, `{ recipientId: 1, type: 1, targetId: 1, groupCreatedAt: -1 }`, `{ latestActivityAt: 1 }`

---

**Reports Collection** (`reports`)  
File: `backend/src/modules/reports/report.model.js`

| Field | Type | Description |
|-------|------|-------------|
| `reporterId` | ObjectId (ref: User) | Reporter |
| `targetType` | Enum: Post, User | What is reported |
| `targetId` | ObjectId | Reported entity |
| `reason` | String | Report reason |
| `details` | String (max 500) | Additional details |
| `status` | Enum: Pending, Resolved, Dismissed | Resolution status |
| `resolvedBy` | ObjectId (ref: User) | Admin who resolved |
| `adminNotes` | String | Admin notes |

Indexes: `{ reporterId: 1, targetType: 1, targetId: 1 }` (unique), `{ reporterId: 1 }`, `{ targetId: 1 }`, `{ status: 1 }`

---

**AppConfigs Collection** (`appconfigs`)  
File: `backend/src/modules/admin/appConfig.model.js`

| Field | Type | Description |
|-------|------|-------------|
| `key` | String (unique) | Configuration key |
| `value` | Mixed | Configuration value (any JSON type) |
| `updatedBy` | ObjectId (ref: User) | Last admin to update |

Known keys:
- `feed_recommendation_weights` - Feed algorithm signal weights
- `auth_background_media` - Login carousel post IDs
- `notification_config` - Push cooldown/grouping settings

---

**Additional Collections:**

| Collection | Model File | Purpose |
|-----------|-----------|---------|
| `featuredposts` | `admin/featured.model.js` | Curated featured posts with sortOrder and expiresAt |
| `cmspages` | `admin/cmsPage.model.js` | CMS content pages (slug, title, content) |
| `globalpopups` | `admin/globalPopup.model.js` | Announcement popups (scheduling, priority) |
| `artworktypes` | `admin/artworkType.model.js` | Artwork categories (name, icon, sortOrder, isActive) |
| `tags` | `tags/tag.model.js` | Tag names with usage count and trending score |
| `communitywaitlists` | `community/community.model.js` | Community feature waitlist |
| `broadcastlogs` | `notifications/broadcastLog.model.js` | Admin broadcast history |
| `searchlogs` | (admin module) | Search query tracking for insights |
| `notifications` | `notifications/notification.model.js` | Legacy flat notifications (migrated to groups) |

### 8.2 PostgreSQL (Analytics/Logs)

PostgreSQL 16 is connected but primarily reserved for:
- Structured analytics data
- Time-series event logging
- Future audit trail
- Complex relational queries that MongoDB handles poorly

Connection: `backend/src/server.js` via `pg.Pool`

### 8.3 Redis (Cache/Sessions/Pub-Sub)

Redis 7.2 serves three critical roles:

#### Session Storage
- Key pattern: `auth:refresh:{userId}:{deviceId}`
- TTL: 30 days
- Enables per-device session revocation

#### OTP Storage
- Key pattern: `auth:otp:{phoneNumber}`
- TTL: 300 seconds (5 minutes)
- Stores 6-digit OTP codes

#### Cache Layer
- Key pattern: `feed:*`, `ranking:creatorQuality`, etc.
- Utility: `getOrSetCache(key, ttl, fetchCallback)` in `shared/utils/cache.js`
- Invalidation: Pattern-based with wildcard (`invalidateCache('feed:*')`)
- Fallback: If Redis fails, falls back to direct DB query

#### Pub/Sub (Socket.IO)
- `@socket.io/redis-adapter` for multi-process message broadcasting
- Enables PM2 cluster mode with consistent Socket.IO delivery

### 8.4 Data Relationships

```
User (1) -----> (N) Post          [authorId]
User (1) -----> (N) Like          [userId]
User (1) -----> (N) Save          [userId]
User (1) -----> (N) Follow        [followerId]
User (1) <----- (N) Follow        [followingId]
User (1) -----> (N) Report        [reporterId]
User (1) -----> (N) NotificationGroup  [recipientId]
Post (1) -----> (N) Like          [postId]
Post (1) -----> (N) Save          [postId]
Post (1) -----> (N) Report        [targetId where targetType='Post']
Post (1) -----> (0..1) FeaturedPost [postId]
```

---

## 9. API Documentation

### 9.1 Response Envelope

All API responses follow this consistent format:

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "nextCursor": "...", "hasNextPage": true }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error description"
  }
}
```

### 9.2 Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Zod validation failed |
| `BAD_REQUEST` | 400 | Invalid request |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource (e.g., username taken) |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 9.3 Authentication Endpoints

**POST /api/v1/auth/google**  
Purpose: Authenticate with Google OAuth  
Auth: None  
Body: `{ idToken: string, deviceId: string }`  
Response: `{ user, accessToken, refreshToken, isNewUser }`

**POST /api/v1/auth/refresh**  
Purpose: Refresh expired access token  
Auth: None  
Body: `{ refreshToken: string }`  
Response: `{ accessToken, refreshToken }`

**POST /api/v1/auth/admin-login**  
Purpose: Admin panel authentication (email/password)  
Auth: None  
Body: `{ email: string, password: string, deviceId: string }`  
Response: `{ user, accessToken, refreshToken }`

**POST /api/v1/auth/otp/send**  
Purpose: Send OTP to phone number for verification  
Auth: Required (Bearer token)  
Rate Limit: 3 per hour  
Body: `{ phoneNumber: string }`  
Response: `{ success: true }`

**POST /api/v1/auth/otp/verify**  
Purpose: Verify phone OTP and link to account  
Auth: Required  
Rate Limit: 5 per 15 minutes  
Body: `{ phoneNumber: string, otp: string }`  
Response: `{ user (updated with phoneNumber) }`

**POST /api/v1/auth/logout**  
Purpose: Revoke refresh token for device  
Auth: Required  
Body: `{ deviceId: string }`  
Response: `{ success: true }`

### 9.4 User Endpoints

**GET /api/v1/users/me**  
Purpose: Get authenticated user's full profile  
Auth: Required  
Response: `{ user object with all fields }`

**PUT /api/v1/users/me**  
Purpose: Update profile fields  
Auth: Required  
Body: `{ username?, fullName?, bio?, location?, website?, whatsapp?, contactPhone?, interests?, role?, nsfwBlurEnabled?, showMatureContent? }`  
Response: `{ updated user }`

**GET /api/v1/users/me/saved**  
Purpose: Get user's saved posts  
Auth: Required  
Query: `{ cursor?, limit? }`  
Response: `{ data: [posts], meta: { nextCursor, hasNextPage } }`

**POST /api/v1/users/me/avatar**  
Purpose: Upload new avatar  
Auth: Required  
Body: `multipart/form-data` with `avatar` file field  
Response: `{ avatarUrl }`

**DELETE /api/v1/users/me/avatar**  
Purpose: Remove avatar  
Auth: Required  
Response: `{ success: true }`

**POST /api/v1/users/me/push-token**  
Purpose: Register Expo push token  
Auth: Required  
Body: `{ token: string }`  
Response: `{ success: true }`

**DELETE /api/v1/users/me/push-token**  
Purpose: Unregister push token  
Auth: Required  
Body: `{ token: string }`  
Response: `{ success: true }`

**PUT /api/v1/users/me/notification-preferences**  
Purpose: Update notification preferences  
Auth: Required  
Body: `{ push: { like?, save?, follow?, comment?, adminBroadcast? }, inApp: { ... } }`  
Response: `{ updated preferences }`

**GET /api/v1/users/search**  
Purpose: Search users by username or name  
Auth: Optional  
Query: `{ q: string, limit? }`  
Response: `{ data: [users] }`

**GET /api/v1/users/:userId**  
Purpose: Get public profile of any user  
Auth: None  
Response: `{ user (public fields only) }`

**GET /api/v1/users/:userId/posts**  
Purpose: Get a user's posts (profile grid)  
Auth: Optional  
Query: `{ cursor?, limit? }`  
Response: `{ data: [posts], meta }`

**GET /api/v1/users/:userId/metrics**  
Purpose: Get user engagement metrics  
Auth: Required  
Response: `{ followers, following, postCount, totalLikes }`

**GET /api/v1/users/:userId/followers**  
Purpose: List user's followers  
Auth: None  
Response: `{ data: [users] }`

**GET /api/v1/users/:userId/following**  
Purpose: List users being followed  
Auth: None  
Response: `{ data: [users] }`

**GET /api/v1/users/:userId/follow/status**  
Purpose: Check if current user follows target  
Auth: Required  
Response: `{ isFollowing: boolean }`

**POST /api/v1/users/:userId/follow**  
Purpose: Follow a user  
Auth: Required  
Response: `{ success: true }`

**DELETE /api/v1/users/:userId/follow**  
Purpose: Unfollow a user  
Auth: Required  
Response: `{ success: true }`

### 9.5 Post Endpoints

**GET /api/v1/posts/feed**  
Purpose: Get personalized home feed  
Auth: Optional (personalized if authenticated)  
Query: `{ cursor?, limit? (default 15) }`  
Response: `{ data: [posts with author, isLikedByMe, isSavedByMe], meta: { nextCursor, hasNextPage } }`

**GET /api/v1/posts/explore**  
Purpose: Get explore/discovery feed  
Auth: Optional  
Query: `{ cursor?, limit?, artworkType? }`  
Response: `{ data: [ranked posts], meta }`

**GET /api/v1/posts/:postId**  
Purpose: Get single post detail  
Auth: Optional  
Response: `{ post with author, isLikedByMe, isSavedByMe }`

**POST /api/v1/posts**  
Purpose: Create new post  
Auth: Required  
Body: `multipart/form-data` with:
- `media` (files, max 6)
- `caption` (string, max 2200)
- `tags` (JSON string or array)
- `artworkType` (JSON string or array)
- `isHumanMade` (boolean/string)
- `isAIGenerated` (boolean/string, optional)
- `isOriginalContent` (boolean/string, optional)
- `isNsfw` (boolean/string, optional)

Response: `{ created post with populated author }`

**PUT /api/v1/posts/:postId**  
Purpose: Update post caption/tags  
Auth: Required (must be author)  
Body: `{ caption?, tags?, artworkType? }`  
Response: `{ updated post }`

**DELETE /api/v1/posts/:postId**  
Purpose: Soft-delete own post  
Auth: Required (must be author)  
Response: `{ success: true }`

**POST /api/v1/posts/:postId/likes**  
Purpose: Like a post  
Auth: Required  
Response: `{ success: true, likesCount }`

**DELETE /api/v1/posts/:postId/likes**  
Purpose: Unlike a post  
Auth: Required  
Response: `{ success: true, likesCount }`

**POST /api/v1/posts/:postId/saves**  
Purpose: Save a post to collection  
Auth: Required  
Response: `{ success: true, savesCount }`

**DELETE /api/v1/posts/:postId/saves**  
Purpose: Unsave a post  
Auth: Required  
Response: `{ success: true, savesCount }`

**GET /api/v1/posts/:postId/likes**  
Purpose: Get users who liked a post  
Auth: Optional  
Response: `{ data: [users] }`

### 9.6 Notification Endpoints

**GET /api/v1/notifications**  
Purpose: Get paginated notification groups  
Auth: Required  
Query: `{ cursor?, limit? }`  
Response: `{ data: [notification groups with recentActors populated], meta }`

**PUT /api/v1/notifications/read**  
Purpose: Mark all notifications as read  
Auth: Required  
Response: `{ success: true }`

**PUT /api/v1/notifications/:notificationId/read**  
Purpose: Mark single notification as read  
Auth: Required  
Response: `{ success: true }`

### 9.7 Tag Endpoints

**GET /api/v1/tags**  
Purpose: Search tags by query  
Auth: Required  
Query: `{ q: string, limit? }`  
Response: `{ data: [tags] }`

### 9.8 Report Endpoints

**POST /api/v1/reports**  
Purpose: Report a post or user  
Auth: Required  
Body: `{ targetType: 'Post'|'User', targetId: string, reason: string, details?: string }`  
Response: `{ report }`

### 9.9 Community Endpoints

**POST /api/v1/community/waitlist**  
Purpose: Join community feature waitlist  
Auth: Required  
Response: `{ success: true }`

**GET /api/v1/community/waitlist/count**  
Purpose: Get waitlist count  
Auth: None  
Response: `{ count: number }`

**POST /api/v1/community/interest**  
Purpose: Register community interest  
Auth: Optional  
Body: `{ email?, name?, interests? }`  
Response: `{ success: true }`

### 9.10 Config Endpoints (Public)

**GET /api/v1/config/auth-media**  
Purpose: Get login carousel media (resolved from post IDs to URLs)  
Auth: None  
Response: `{ data: [{url, type, postId, caption, artist}] }`

**GET /api/v1/config/cms/:slug**  
Purpose: Get CMS page content  
Auth: None  
Response: `{ data: { slug, title, content } }`

**GET /api/v1/config/global-popup**  
Purpose: Get active announcement popup  
Auth: None  
Response: `{ data: popup | null }`

**GET /api/v1/config/featured**  
Purpose: Get featured posts carousel  
Auth: Optional (for NSFW filtering)  
Response: `{ data: [posts] }`

**GET /api/v1/config/artwork-types**  
Purpose: Get active artwork type categories  
Auth: None  
Response: `{ data: [{name, icon, sortOrder}] }`

### 9.11 Share Page Endpoints (HTML)

These return server-rendered HTML with Open Graph meta tags:

| Endpoint | Purpose |
|----------|---------|
| `GET /p/:postId` | Artwork share page with media preview, author info, deep link |
| `GET /u/:username` | User profile share page with deep link |
| `GET /c/:id` | Community share page (placeholder) |
| `GET /e/:id` | Event share page (placeholder) |
| `GET /m/:id` | Marketplace share page (placeholder) |

### 9.12 Health Check

**GET /health**  
Purpose: Load balancer / monitoring health check  
Auth: None  
Response: `{ status: 'OK', timestamp: '...' }`

---

## 10. Authentication

### 10.1 Overview

Art Nepalaya uses a multi-factor authentication system combining Google OAuth (primary), phone OTP (secondary), and traditional email/password (admin only).

### 10.2 Google OAuth Flow

File: `backend/src/modules/auth/auth.service.js`

1. Mobile app initiates Google Sign-In via Expo AuthSession
2. User authenticates with Google, receives `idToken`
3. App sends `{ idToken, deviceId }` to `POST /api/v1/auth/google`
4. Backend verifies token using `google-auth-library` (`OAuth2Client.verifyIdToken`)
5. Supports multiple audiences: web, Android, and iOS client IDs
6. Find existing user by email or create new user
7. New users get auto-generated username from display name (with collision handling)
8. Generate JWT access token (15min) + refresh token (30d)
9. Store refresh token in Redis keyed by `auth:refresh:{userId}:{deviceId}`
10. Return `{ user, accessToken, refreshToken, isNewUser }`

### 10.3 JWT Token Structure

**Access Token (15 minutes):**
```json
{
  "id": "userId",
  "role": "Art Lover",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh Token (30 days):**
```json
{
  "id": "userId",
  "deviceId": "unique-device-identifier",
  "iat": 1234567890,
  "exp": 1237159890
}
```

### 10.4 Token Refresh Mechanism

File: `backend/src/modules/auth/auth.service.js` - `refreshSession()`

1. Client detects 401 response (access token expired)
2. Client sends refresh token to `POST /api/v1/auth/refresh`
3. Backend verifies refresh token signature
4. Checks Redis for stored token: `auth:refresh:{userId}:{deviceId}`
5. Validates stored token matches submitted token (prevents stolen token reuse)
6. Generates new access + refresh token pair
7. Updates Redis with new refresh token
8. Returns new tokens to client

### 10.5 Device-Based Session Management

Each device maintains its own session:
- Redis key: `auth:refresh:{userId}:{deviceId}`
- Enables selective logout (revoke one device without affecting others)
- Enables "log out all devices" by deleting all keys for a user
- TTL: 30 days (auto-cleanup of stale sessions)

### 10.6 Phone OTP Verification

Flow (requires authenticated session first):

1. User requests OTP: `POST /api/v1/auth/otp/send` (rate-limited: 3/hour)
2. Backend generates 6-digit OTP, stores in Redis: `auth:otp:{phoneNumber}` (TTL: 5min)
3. In development: OTP logged to console. In production: sent via SMS provider
4. User submits OTP: `POST /api/v1/auth/otp/verify` (rate-limited: 5/15min)
5. Backend verifies against Redis, links phone to user account
6. Checks for phone number conflicts (already linked to another account)

### 10.7 Admin Authentication

Admin login uses email/password:
- Endpoint: `POST /api/v1/auth/admin-login`
- Password verification via `bcrypt.compare()`
- Requires user to have `role: 'Admin'` in database
- Same JWT structure as mobile auth
- Admin panel stores tokens in localStorage

### 10.8 Auth Middleware

**authGuard** (`backend/src/middlewares/authGuard.js`):
1. Extract Bearer token from `Authorization` header
2. Verify JWT with `JWT_ACCESS_SECRET`
3. Load user from MongoDB (only `_id`, `role`, `status`)
4. Block banned/suspended users (403)
5. Set `req.user = { id, role }`
6. Handle `TokenExpiredError` specifically (for client refresh logic)

**optionalAuth** (`backend/src/middlewares/optionalAuth.js`):
- Same as authGuard but passes through if no token present
- Sets `req.user = null` for unauthenticated requests
- Used for feeds (authenticated users get personalized results)

**requireRole** (`backend/src/middlewares/roleGuard.js`):
```javascript
export const requireRole = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ ... });
  }
  next();
};
```

### 10.9 Security Considerations

- Access tokens are short-lived (15 minutes) to limit exposure
- Refresh tokens are stored server-side (Redis) enabling immediate revocation
- Device ID prevents token theft across devices
- OTP endpoints are rate-limited to prevent brute-force
- Admin passwords use bcrypt (cost factor determined by library default)
- Google token verification uses official `google-auth-library`
- All tokens transmitted over HTTPS only

---

## 11. Media System

### 11.1 Overview

Art Nepalaya uses Cloudinary as the media storage and delivery platform, handling both images and videos with CDN-backed delivery worldwide.

### 11.2 Upload Architecture

File: `backend/src/middlewares/upload.js`

**Multer Configuration:**
- Storage: Memory (buffers held in RAM during upload)
- File size limit: 100MB per file
- Max files: 6 per request (5 images + 1 video)
- Accepted MIME types:
  - Images: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `image/heif`
  - Videos: `video/mp4`, `video/quicktime`

**Upload Flow:**
1. Client sends `multipart/form-data` with `media` field
2. Multer stores files in memory buffers
3. `secureUpload.array('media', 6)` validates file count and types
4. `handleUploadErrors` middleware translates Multer errors
5. Service layer uploads each buffer to Cloudinary
6. Cloudinary returns `{ secure_url, public_id }`
7. Post document stores: `media: [{ url, providerId, type }]`

### 11.3 Cloudinary Integration

File: `backend/src/config/cloudinary.js`

Configuration via environment variables:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Upload options:
- `resource_type: 'auto'` (Cloudinary detects image vs video)
- Returns `secure_url` (HTTPS CDN URL) and `public_id` (for deletion/transforms)

### 11.4 Image Optimization

Cloudinary URL-based transformations are used client-side for responsive delivery:

```
Original: https://res.cloudinary.com/{cloud}/image/upload/v1/{path}.jpg
Optimized: https://res.cloudinary.com/{cloud}/image/upload/c_fill,w_400,q_auto,f_webp/v1/{path}.jpg
```

No server-side image processing (no `sharp` dependency). The mobile app constructs transformation URLs for:
- Feed thumbnails (width-constrained)
- Profile avatars (square crop)
- Full-resolution detail view (original)

### 11.5 Video Support

- Videos uploaded as `video/mp4` or `video/quicktime`
- Cloudinary handles transcoding and adaptive streaming
- Thumbnails generated via URL transforms: `/so_0/` (first frame as image)
- Video poster generation: Replace extension with `.jpg` and insert `so_0/` transform

File: `backend/src/modules/share/share.routes.js` - `getVideoThumbnailUrl()`

```javascript
// Transform: https://res.cloudinary.com/{cloud}/video/upload/v1/file.mp4
// To:       https://res.cloudinary.com/{cloud}/video/upload/so_0/v1/file.jpg
```

### 11.6 Media Deletion

When a post is hard-deleted by admin:
1. Extract `providerId` from each media item
2. Call `cloudinary.uploader.destroy(providerId)` for each
3. Delete post document from MongoDB

Soft-delete (`deletedAt` timestamp) preserves media on Cloudinary for potential restoration.

### 11.7 Avatar Upload

Separate endpoint for user avatar:
- `POST /api/v1/users/me/avatar`
- Single file upload (`secureUpload.single('avatar')`)
- Uploads to Cloudinary, stores URL in `User.avatarUrl`
- Old avatar cleanup via `cloudinary.uploader.destroy()`

### 11.8 Content Security Policy for Media

Share pages have relaxed CSP to display Cloudinary media:
```
img-src 'self' data: blob: https: https://res.cloudinary.com https://lh3.googleusercontent.com
media-src 'self' https: https://res.cloudinary.com
```

API routes have strict CSP: `default-src 'none'`

### 11.9 Limits Summary

| Constraint | Value |
|-----------|-------|
| Max files per post | 6 |
| Max file size | 100MB |
| Supported image formats | JPEG, PNG, WebP, GIF, HEIC, HEIF |
| Supported video formats | MP4, MOV |
| Caption length | 2,200 characters |
| Avatar size | Same limits (100MB) |
| Request body size | 50KB (non-multipart) |

---

## 12. Notifications

### 12.1 Architecture Overview

The notification system operates on three channels:
1. **In-App (Grouped):** NotificationGroup documents in MongoDB, fetched on demand
2. **Push (Expo SDK):** Delivered via Expo Push Service to FCM (Android) / APNs (iOS)
3. **Real-time (Socket.IO):** Instant unread count updates and notification previews

### 12.2 Notification Types

| Type | Trigger | Target | Example Message |
|------|---------|--------|-----------------|
| `Like` | User likes a post | Post | "User liked your artwork" |
| `Save` | User saves a post | Post | "User saved your artwork" |
| `Follow` | User follows another | User | "User started following you" |
| `Comment` | User comments (future) | Post | "User commented on your artwork" |
| `AdminBroadcast` | Admin sends broadcast | System | Custom title/message |
| `System` | System-generated | System | Platform announcements |

Future types defined in schema: `Mention`, `ArtworkApproved`, `ArtworkRejected`, `Reply`, `MarketplaceOrder`, `Payment`, `LiveEvent`, `CreatorSubscription`

### 12.3 Grouped Notifications

File: `backend/src/modules/notifications/notification.service.js`

Instead of creating one notification per interaction, the system groups them:

**Grouping Logic:**
1. For each interaction, find an existing active NotificationGroup with matching `(recipientId, type, targetId)` within a configurable time window
2. If found: increment `actorCount`, append sender to `recentActors[]`, update `latestActivityAt`
3. If not found: create a new NotificationGroup

**Display Result:**
- Instead of 5 separate "X liked your post" notifications
- User sees: "User1, User2, and 3 others liked your artwork"

**Groupable types:** Like, Save, Follow, Comment  
**Non-groupable types:** AdminBroadcast, System (always create independent groups)

### 12.4 Push Notification Delivery

File: `backend/src/shared/services/pushService.js`

**Push Service Architecture:**

```javascript
// 1. Validate tokens via Expo.isExpoPushToken()
// 2. Build messages: { to, sound, title, body, data }
// 3. Chunk via expo.chunkPushNotifications()
// 4. Send via expo.sendPushNotificationsAsync()
// 5. Track tickets for receipt checking
// 6. After 15s delay: check receipts
// 7. Clean up invalid tokens (DeviceNotRegistered)
```

**Push Cooldown System:**
- Each NotificationGroup tracks `lastPushSentAt`
- Push is only sent if elapsed time exceeds the configured cooldown
- Prevents push spam when multiple likes arrive in quick succession
- Cooldown configurable per notification type via AppConfig

**Token Cleanup:**
- When Expo returns `DeviceNotRegistered` receipt
- Automatically removes invalid token from `User.pushTokens[]`
- Prevents wasted push attempts on subsequent notifications

### 12.5 User Preferences

Stored in `User.notificationPreferences`:

```javascript
{
  push: {
    like: true,      // Push for likes
    save: true,      // Push for saves
    follow: true,    // Push for new followers
    comment: true,   // Push for comments
    adminBroadcast: true  // Push for admin broadcasts
  },
  inApp: {
    like: true,      // In-app for likes
    save: true,      // In-app for saves
    follow: true,    // In-app for followers
    comment: true,   // In-app for comments
    adminBroadcast: true  // In-app for broadcasts
  }
}
```

Users can independently control push vs in-app delivery per notification type.

### 12.6 Admin Broadcasts

File: `backend/src/modules/admin/admin.controller.js`

1. Admin composes broadcast in admin panel (title + message)
2. `POST /api/v1/admin/notifications/broadcast`
3. System fetches all users with valid push tokens
4. Respects `notificationPreferences.push.adminBroadcast` preference
5. Creates NotificationGroup for each recipient (type: AdminBroadcast)
6. Sends push to all eligible users in chunks
7. Logs delivery stats in `BroadcastLog` (title, message, recipientCount, pushesSent, sentBy)

### 12.7 Real-time Socket.IO Delivery

When a notification is created/updated:

```javascript
// Emit to recipient's personal room
emitToUser(recipientId, EVENTS.NOTIFICATION_COUNT_CHANGED, { unreadCount });
emitToUser(recipientId, EVENTS.NOTIFICATION_UPDATED, { group: populatedGroup });
```

Mobile client listens and updates Redux `notificationSlice.unreadCount` in real-time.

### 12.8 Notification Read Flow

- **Mark one as read:** `PUT /api/v1/notifications/:notificationId/read`
  - Sets `isRead: true` on the NotificationGroup
- **Mark all as read:** `PUT /api/v1/notifications/read`
  - Bulk update all unread groups for the user

---

## 13. Feed Algorithm

### 13.1 Architecture Overview

File: `backend/src/modules/posts/recommendation.service.js`

The feed algorithm uses a **pluggable signal registry architecture** that allows new ranking signals to be added without modifying the core scoring logic. Weights for all signals are dynamically configurable via the AppConfig collection.

### 13.2 Signal Registry Pattern

```javascript
const signalRegistry = new Map();

registerSignal(name, scoringFunction, defaultWeight);
unregisterSignal(name);
getRegisteredSignals(); // Returns all registered signal names
```

New signals are registered with:
- **name:** Unique identifier (must match a key in the weights object)
- **fn:** `(post, context) => number` - computes raw signal value
- **defaultWeight:** Used if no override exists in AppConfig

### 13.3 Registered Signals (13 Total)

| Signal | Default Weight | Description |
|--------|---------------|-------------|
| `likes` | 3 | Raw like count of the post |
| `saves` | 7 | Raw save count (highest engagement signal) |
| `comments` | 4 | Raw comment count (graceful if field missing) |
| `shares` | 5 | Raw share count (graceful if field missing) |
| `views` | 1 | Raw view count (graceful if field missing) |
| `creatorFollowers` | 2 | `log2(1 + author.stats.followers)` |
| `creatorQuality` | 3 | `log2(1 + avgEngagementPerPost)` for the author |
| `verification` | 2 | +5 bonus if author is verified |
| `freshness` | 8 | Time decay: `1 / (1 + (hours/24)^1.5)` scaled to 0-10 |
| `newCreatorBoost` | 4 | +1.5 if account < 30 days OR < 10 total posts |
| `randomness` | 1 | Deterministic pseudo-random (0-2 range, seeded by post ID) |
| `diversity` | 5 | Applied post-scoring (see Section 13.5) |
| `exploration` | 3 | 10% of feed slots reserved for discovery |

### 13.4 Scoring Engine

```javascript
scorePost(post, context, weights) => number
```

For each post, iterates all registered signals:
```
totalScore = SUM(signal.fn(post, context) * weights[signal.name])
```

Signals that throw errors are gracefully skipped (logged, not fatal).

### 13.5 Freshness Decay Formula

```javascript
const halfLife = 24; // hours
const gravity = 1.5;
const hoursSincePosted = (now - post.createdAt) / (1000 * 60 * 60);
const decayMultiplier = 1 / (1 + Math.pow(hoursSincePosted / halfLife, gravity));
// Returns: decayMultiplier * 10 (score range 0-10)
```

This produces:
- 0 hours: score = 10 (maximum freshness)
- 24 hours: score = 5 (half-life point)
- 48 hours: score ~= 2.6
- 72 hours: score ~= 1.5
- 1 week: score ~= 0.4

### 13.6 Diversity Enforcement

Function: `applyDiversity(posts)`

Prevents consecutive posts from the same creator in the feed:
1. Iterate through scored posts in order
2. For each candidate, check if author appeared in last 2 positions
3. If consecutive: skip to next candidate
4. If all remaining are consecutive: place anyway (prevents infinite loop)

Result: No user ever sees 3+ posts in a row from the same artist.

### 13.7 Exploration Slots

10% of feed positions are reserved for "exploration" content:
- Posts that do NOT match user's stated interests (artworkType)
- Selected from lower-scored posts (discovery of new content)
- Shuffled with deterministic pseudo-randomness
- Prevents filter bubbles and helps new/niche artists gain exposure

### 13.8 New Creator Boost

Creators qualify for a boost if:
- Account age < 30 days, OR
- Total post count < 10

Boost value: +1.5 raw score (multiplied by weight 4 = +6 composite points)

This ensures new artists get initial visibility before building an audience.

### 13.9 Creator Quality Score

Computed via MongoDB aggregation pipeline:
```javascript
// For each author: average(likesCount + savesCount) across all their posts
// Cached in Redis for 5 minutes (key: 'ranking:creatorQuality')
// Applied as: log2(1 + avgEngagement)
```

### 13.10 Home Feed Building Process

Function: `buildRecommendedFeed(userId, cursor, limit, showMatureContent)`

1. **User Signals:** Load user's `interests[]` (artwork type preferences)
2. **Fallback Check:** If no interests set, return `null` (triggers legacy fallback)
3. **Weights:** Load from `AppConfig('feed_recommendation_weights')` or use defaults
4. **Safety Filters:** Exclude soft-deleted, NSFW (if opted out), banned/suspended authors
5. **Candidate Pool:** Fetch `3 * limit` posts (sorted by `_id desc`)
6. **Context Building:** Compute creatorQualityMap and creatorPostCountMap
7. **Scoring:** Score all candidates via signal registry
8. **Slot Allocation:** 90% main slots + 10% exploration slots
9. **Main Selection:** Top-scored posts, diversity-enforced
10. **Exploration Selection:** Non-matching interest posts from bottom scores
11. **Final Assembly:** Combine, apply final diversity pass
12. **Pagination:** Cursor-based (oldest candidate `_id`)

### 13.11 Configurable Weights

Weights can be updated at runtime via the admin panel:
- Stored in AppConfig: `key = 'feed_recommendation_weights'`
- Merged with defaults (new signals always have a weight)
- No server restart required
- Changes take effect on next feed request

Default weight configuration:
```javascript
{
  likes: 3, saves: 7, comments: 4, shares: 5, views: 1,
  creatorFollowers: 2, creatorQuality: 3, verification: 2,
  freshness: 8, diversity: 5, exploration: 3,
  randomness: 1, newCreatorBoost: 4
}
```

### 13.12 Fallback Algorithm

When the recommendation engine cannot be used (no user interests, or error):
- Falls back to basic chronological feed with popularity boost
- Sorted by `_id desc` (newest first)
- Basic scoring: `likesCount * 3 + savesCount * 5`
- Same safety filters (deleted, NSFW, banned)

---

## 14. Explore Algorithm

### 14.1 Overview

File: `backend/src/modules/posts/recommendation.service.js` - `buildExploreFeed()`

The Explore feed is designed for content discovery. Unlike the Home feed (which is personalized), the Explore feed surfaces content based on objective quality metrics with a curated composition split.

### 14.2 Composition Strategy

The explore feed allocates posts across three pools:

| Pool | Allocation | Criteria |
|------|-----------|----------|
| **Trending** | ~70% | Highest composite scores (engagement-driven) |
| **Established** | ~20% | From verified creators OR creators with 50+ followers |
| **Fresh** | ~10% | Posts < 48 hours old from creators with < 20 total posts |

### 14.3 Scoring

Uses the same signal registry and weights as the Home feed:
- All 13 signals are computed
- Posts are scored identically
- Sorted by composite score descending

The difference is in post selection (pool-based) rather than signal computation.

### 14.4 Pool Definitions

**Trending Pool:**
- Top N*2 scored posts (overfetch for diversity filtering)
- Represents objectively popular content

**Established Pool:**
```javascript
const establishedPool = scoredPosts.filter(s => {
  const author = s.post.authorId;
  return author.isVerified || (author.stats?.followers || 0) >= 50;
});
```
- Quality signal: verified badge or proven audience
- Gives exposure to serious/professional artists

**Fresh Pool:**
```javascript
const freshPool = scoredPosts.filter(s => {
  const postTime = new Date(s.post.createdAt).getTime();
  const isRecent = postTime >= (now - 48 * 60 * 60 * 1000);
  const isNewCreator = creatorPostCountMap.get(authorId) < 20;
  return isRecent && isNewCreator;
});
```
- Posts less than 48 hours old
- From creators with fewer than 20 total posts
- Ensures new artists always get Explore page visibility

### 14.5 Deduplication

Posts are selected from pools in order (trending first), with a `selectedIds` Set preventing duplicates:
- A post in both trending and established pools appears only once
- Remaining slots filled from overall scored pool if pools are exhausted

### 14.6 Filters

**Artwork Type Filter:**
- Optional query parameter: `?artworkType=Mandala`
- Applied as case-insensitive regex match on `post.artworkType[]`
- Enables category browsing within Explore

**Safety Filters (same as Home feed):**
- Exclude soft-deleted posts (`deletedAt: null`)
- Exclude posts from banned/suspended users
- Exclude NSFW unless opted in

### 14.7 Diversity

Same `applyDiversity()` function as Home feed:
- No consecutive posts from the same creator
- Applied after pool selection, before pagination

### 14.8 Pagination

- Cursor-based: same pattern as Home feed
- Fetches `3 * limit` candidates for scoring headroom
- `nextCursor` = oldest candidate `_id` if more results exist
- Client sends cursor for next page

### 14.9 Guest Access

The explore feed works without authentication:
- `optionalAuth` middleware allows guest access
- No personalization for guests
- NSFW filtering defaults to hiding mature content for guests

---

## 15. Deployment

### 15.1 Infrastructure

| Component | Specification |
|-----------|--------------|
| Provider | Ncell Cloud VPS |
| OS | Ubuntu 24.04 LTS |
| Architecture | Single VPS (all services co-located) |
| SSL | Let's Encrypt via Certbot |
| Container Runtime | Docker + Docker Compose |
| Process Manager | PM2 (cluster mode inside container) |

### 15.2 Docker Compose Services

**Development** (`backend/docker-compose.yml`):

| Service | Image/Build | Ports | Purpose |
|---------|-------------|-------|---------|
| `proxy` | `nginx:alpine` | 80, 443 | Reverse proxy |
| `backend` | Custom Dockerfile | Internal | Express API |
| `admin` | Custom Dockerfile | Internal | Admin panel (Vite build) |
| `mongodb` | `mongo:7.0` | 27017 | Primary database |
| `postgresql` | `postgres:16-alpine` | 5432 | Analytics/logs database |
| `redis` | `redis:7.2-alpine` | 6380:6379 | Cache/sessions/pub-sub |

**Production** (`backend/docker-compose.prod.yml`):

| Service | Image/Build | Notes |
|---------|-------------|-------|
| `proxy` | `nginx:alpine` | Uses `nginx.prod.conf` + SSL certs |
| `backend` | `Dockerfile.prod` | PM2 cluster mode, 1GB memory limit |
| `admin` | Multi-stage build | Static build served by nginx |
| `mongodb` | `mongo:7.0` | Auth enabled, no exposed ports |
| `postgresql` | `postgres:16-alpine` | Auth enabled, no exposed ports |
| `redis` | `redis:7.2-alpine` | Password protected, no exposed ports |

### 15.3 Nginx Configuration

**Development (`nginx.conf`):**
- HTTP only (port 80)
- Proxies `/api/` and `/health` to backend:8080
- Proxies `/` (admin panel) to admin container
- Share pages served by backend

**Production (`nginx.prod.conf`):**
- HTTP to HTTPS redirect (301)
- SSL termination with `fullchain.pem` + `privkey.pem`
- TLS 1.2/1.3 only
- Proxy headers: `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- WebSocket upgrade for Socket.IO (`Upgrade` + `Connection` headers)
- Static file caching headers

### 15.4 PM2 Cluster Mode

The production backend container uses PM2 for:
- Multi-process clustering (utilizes all CPU cores)
- Automatic restart on crash
- Zero-downtime reload
- Memory limit enforcement (1GB per container)
- Log management

### 15.5 SSL Certificate Management

```bash
# Initial certificate (run on VPS)
sudo certbot certonly --standalone -d api.artnepalaya.com -d admin.artnepalaya.com -d app.artnepalaya.com

# Auto-renewal (crontab)
0 0 1 * * certbot renew --quiet && docker compose restart proxy
```

Certificates mounted into nginx container at `/etc/nginx/ssl/`.

### 15.6 Environment Variables

Key environment variables (`.env.production`):

| Variable | Purpose |
|----------|---------|
| `PORT` | Backend port (8080) |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | Allowed origins (comma-separated) |
| `JWT_ACCESS_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret (min 32 chars) |
| `MONGO_URI` | MongoDB connection string with auth |
| `POSTGRES_URI` | PostgreSQL connection string |
| `REDIS_URL` | Redis URL with password |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID |
| `GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB root username |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB root password |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | PostgreSQL database name |
| `REDIS_PASSWORD` | Redis auth password |
| `CSP_IMG_SRC` | CSP img-src directive for share pages |

### 15.7 Build Pipeline

```bash
# On VPS:
cd /opt/artnepalaya
git pull origin main

# Build and deploy
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

### 15.8 Release Process

1. Merge feature branch into `main`
2. SSH into VPS
3. Pull latest code
4. Run `docker compose -f docker-compose.prod.yml build`
5. Run `docker compose -f docker-compose.prod.yml up -d`
6. Monitor logs for startup errors
7. Verify health check: `curl https://api.artnepalaya.com/health`

### 15.9 Rollback Procedure

```bash
# Quick rollback: revert to previous image
docker compose -f docker-compose.prod.yml down
git checkout HEAD~1
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Database rollback: restore from backup (if schema changes)
mongorestore --uri="$MONGO_URI" --drop /backups/latest/
```

### 15.10 Backup Strategy

```bash
# MongoDB backup (daily cron)
mongodump --uri="$MONGO_URI" --out=/backups/$(date +%Y%m%d)

# PostgreSQL backup
pg_dump $POSTGRES_URI > /backups/pg_$(date +%Y%m%d).sql

# Redis (persistence via RDB snapshots in volume)
```

---

## 16. Troubleshooting Guide

### 16.1 Where to Look

| Issue Type | Log Source | Command |
|-----------|-----------|---------|
| API errors | Backend container | `docker compose logs -f backend` |
| Process crashes | PM2 inside container | `docker exec art_backend pm2 logs` |
| Nginx routing | Proxy container | `docker compose logs -f proxy` |
| Database issues | MongoDB container | `docker compose logs -f mongodb` |
| Redis issues | Redis container | `docker compose logs -f redis` |
| Push failures | Backend logs | Grep for `[PushService]` |
| Feed ranking | Backend logs | Grep for `[Ranking]` |
| Socket.IO | Backend logs | Grep for `[Socket]` |

### 16.2 Common Issues

#### Issue: 502 Bad Gateway
**Cause:** Backend container not running or not listening on port 8080  
**Debug:**
```bash
docker compose ps  # Check if backend is running
docker compose logs backend | tail -50  # Check startup errors
docker exec art_backend pm2 status  # Check PM2 process status
```
**Fix:** Usually a crash on startup. Check environment variables and database connections.

#### Issue: CORS Errors
**Cause:** Request origin not in `CORS_ORIGIN` environment variable  
**Debug:** Check `CORS_ORIGIN` value in `.env.production`  
**Fix:** Add the requesting domain to `CORS_ORIGIN` (comma-separated list)

#### Issue: Authentication Failures (401)
**Cause:** Token expired, Redis session cleared, or clock skew  
**Debug:**
```bash
# Check if Redis is running
docker exec art_redis redis-cli ping

# Check if refresh token exists
docker exec art_redis redis-cli get "auth:refresh:{userId}:{deviceId}"
```
**Fix:** Client should trigger token refresh. If refresh also fails, user needs to re-login.

#### Issue: Push Notifications Not Delivered
**Cause:** Invalid tokens, user preferences, or Expo service issues  
**Debug:** Look for `[PushService]` logs:
```bash
docker compose logs backend | grep "PushService"
```
**Check:**
1. User has valid push tokens (`User.pushTokens[]`)
2. User preferences allow push for this type
3. Push cooldown has not been exceeded
4. Token is valid Expo push token format

#### Issue: Mobile App Cannot Connect
**Cause:** Network issues, wrong API URL, SSL certificate problems  
**Debug:**
1. Verify health check: `curl https://api.artnepalaya.com/health`
2. Check SSL certificate expiry: `openssl s_client -connect api.artnepalaya.com:443`
3. Verify CORS allows mobile requests

#### Issue: Feed Returns Empty
**Cause:** No posts in database, all authors banned, or NSFW filter hiding everything  
**Debug:**
```bash
# Check post count in MongoDB
docker exec art_mongodb mongosh --eval "db.posts.countDocuments({deletedAt:null})"
```
**Fix:** Ensure posts exist and authors have `status: 'active'`

#### Issue: Image Upload Fails
**Cause:** Cloudinary credentials, file too large, or invalid file type  
**Debug:** Check backend logs for Cloudinary API errors  
**Fix:**
1. Verify `CLOUDINARY_*` environment variables
2. Check file size (max 100MB)
3. Verify MIME type is in allowed list

#### Issue: Socket.IO Disconnections
**Cause:** Token expired during connection, Redis adapter failure  
**Debug:**
```bash
docker compose logs backend | grep "Socket"
docker exec art_redis redis-cli ping
```
**Fix:** Client should reconnect with fresh token after refresh

#### Issue: Slow Feed Performance
**Cause:** Missing indexes, large candidate pool, Redis cache miss  
**Debug:**
1. Check MongoDB query explain plans
2. Verify Redis is caching creator quality data
3. Monitor aggregation pipeline execution time

### 16.3 Health Monitoring

```bash
# Quick health check
curl -s https://api.artnepalaya.com/health | jq .

# Container status
docker compose -f docker-compose.prod.yml ps

# Resource usage
docker stats

# PM2 process status
docker exec art_backend pm2 status

# Redis memory
docker exec art_redis redis-cli info memory

# MongoDB connection count
docker exec art_mongodb mongosh --eval "db.serverStatus().connections"
```

### 16.4 Database Diagnostics

```bash
# MongoDB shell access
docker exec -it art_mongodb mongosh

# Check indexes
db.posts.getIndexes()
db.users.getIndexes()

# Slow query analysis
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)

# Collection sizes
db.stats()
```

---

## 17. Feature Map

### 17.1 Feature-to-Implementation Matrix

| Feature | Backend Files | API Endpoint | Database | Mobile | Admin |
|---------|--------------|-------------|----------|--------|-------|
| **Google Auth** | `auth/auth.service.js`, `auth/auth.controller.js` | `POST /api/v1/auth/google` | `users` (MongoDB), `auth:refresh:*` (Redis) | `auth.service.ts`, `authSlice.ts` | `Login.tsx` |
| **Phone OTP** | `auth/auth.service.js` | `POST /api/v1/auth/otp/send`, `POST /api/v1/auth/otp/verify` | `auth:otp:*` (Redis), `users.phoneNumber` | `auth/PhoneVerify` | - |
| **Home Feed** | `posts/post.service.js`, `posts/recommendation.service.js` | `GET /api/v1/posts/feed` | `posts`, `users`, `likes`, `saves` | `screens/home/`, `feedSlice.ts` | `feed-analytics` |
| **Explore Feed** | `posts/recommendation.service.js` | `GET /api/v1/posts/explore` | `posts`, `users` | `screens/explore/` | - |
| **Post Creation** | `posts/post.service.js`, `posts/post.controller.js` | `POST /api/v1/posts` | `posts`, `tags` | `screens/create/` | - |
| **Like** | `posts/post.service.js` | `POST /api/v1/posts/:postId/likes` | `likes`, `posts.likesCount` | Inline button | `Posts.tsx` |
| **Save** | `posts/post.service.js` | `POST /api/v1/posts/:postId/saves` | `saves`, `posts.savesCount` | Inline button | - |
| **Follow** | `users/user.service.js`, `users/user.controller.js` | `POST /api/v1/users/:userId/follow` | `follows`, `users.stats` | Profile screen | `Users.tsx` |
| **Notifications** | `notifications/notification.service.js` | `GET /api/v1/notifications` | `notificationgroups` | `screens/notifications/`, `notificationSlice.ts` | `PushNotifications.tsx` |
| **Push** | `shared/services/pushService.js` | (internal) | `users.pushTokens`, `notificationgroups.lastPushSentAt` | `pushNotification.service.ts` | - |
| **Admin Broadcast** | `notifications/notification.service.js`, `admin/admin.controller.js` | `POST /api/v1/admin/notifications/broadcast` | `broadcastlogs`, `notificationgroups` | Notification list | `PushNotifications.tsx` |
| **Moderation** | `admin/admin.controller.js` | `GET/PUT /api/v1/admin/reports/*` | `reports` | Report button | `Moderation.tsx` |
| **Featured** | `admin/admin.controller.js`, `admin/config.routes.js` | `GET/POST/DELETE /api/v1/admin/featured` | `featuredposts` | Featured carousel | `Featured.tsx` |
| **CMS** | `admin/admin.controller.js`, `admin/config.routes.js` | `GET/PUT /api/v1/admin/cms/:slug` | `cmspages` | Settings (Terms, etc.) | `CmsEditor.tsx` |
| **Share Pages** | `share/share.routes.js` | `GET /p/:postId`, `GET /u/:username` | `posts`, `users` | Deep link handler | - |
| **User Search** | `users/user.controller.js` | `GET /api/v1/users/search` | `users` (text match) | Explore search | `Users.tsx` |
| **Tag System** | `tags/tag.service.js`, `tags/tag.controller.js` | `GET /api/v1/tags` | `tags` | Post creation | `TagManagement.tsx` |
| **Artwork Types** | `admin/admin.controller.js`, `admin/config.routes.js` | `GET /api/v1/config/artwork-types` | `artworktypes` | Category filter | `ArtworkTypes.tsx` |
| **Global Popup** | `admin/admin.controller.js`, `admin/config.routes.js` | `GET /api/v1/config/global-popup` | `globalpopups` | Modal overlay | `GlobalPopup.tsx` |
| **NSFW** | `posts/post.service.js`, `users/user.model.js` | Feed endpoints + user prefs | `posts.isNsfw`, `users.showMatureContent` | Blur overlay | `Posts.tsx` |
| **User Verify** | `admin/admin.controller.js` | `PUT /api/v1/admin/users/:userId/verify` | `users.isVerified`, `users.verifiedType` | Badge display | `Users.tsx` |
| **Real-time** | `realtime/socketServer.js`, `realtime/emitter.js` | Socket.IO (ws://) | Redis Pub/Sub | `socket.service.ts` | - |
| **Community** | `community/community.controller.js` | `POST /api/v1/community/waitlist` | `communitywaitlists` | Community tab | `CommunityInterest.tsx` |
| **Auth Media** | `admin/admin.controller.js`, `admin/config.routes.js` | `GET /api/v1/config/auth-media` | `appconfigs` | Login carousel | `AuthMedia.tsx` |

---

## 18. Technical Debt

### 18.1 Known Issues

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| No automated tests | High | Entire codebase | No regression detection, manual verification only |
| `console.log` diagnostics in production | Medium | `post.service.js`, various | Noise in production logs, minor performance |
| `artworkType` parsing investigation | Low | `post.service.js`, `post.validation.js` | Diagnostic logging added to trace form-data string parsing |
| No CI/CD pipeline | High | - | Manual deployment process, no automated checks |
| Socket.IO CORS set to `*` | Medium | `realtime/socketServer.js` | Should restrict to known origins in production |
| OTP delivery not implemented | Medium | `auth.service.js` | OTP only logged to console (no SMS provider integrated) |
| PostgreSQL underutilized | Low | `server.js` | Connected but no active tables/queries beyond `SELECT NOW()` |
| No database migrations | Medium | - | Schema changes require manual intervention |
| Legacy notification model | Low | `notification.model.js` | Old flat model kept alongside new grouped model |
| No pagination on some admin endpoints | Low | `admin.controller.js` | Large datasets may cause slow responses |

### 18.2 Code Quality Concerns

- **Error handling inconsistency:** Mix of `throw Object.assign(new Error(), { status })` and direct `res.status().json()` patterns
- **No TypeScript on backend:** JavaScript with no type checking leads to runtime type errors
- **Duplicate logic:** Form-data parsing (string/array handling) repeated in multiple places
- **No request ID tracking:** Makes correlating logs across services difficult
- **No structured logging:** Uses `console.log/error` instead of a logging library (Winston/Pino)

### 18.3 Architecture Debt

- **Monolithic backend:** All modules in single process; scaling requires full replication
- **In-memory file uploads:** Large video uploads (100MB) held in RAM before Cloudinary upload
- **No job queue:** Push notifications, cache invalidation, and Cloudinary uploads are synchronous
- **No read replicas:** Single MongoDB instance handles all read/write traffic
- **No CDN for API responses:** All requests hit origin server

### 18.4 Security Debt

- **No CSRF protection:** Relies on JWT-only auth (acceptable for API-only, but share pages have inline scripts)
- **No API versioning strategy:** All routes are `/api/v1/` but no plan for v2 migration
- **Secrets in `.env` files:** No external secrets manager (Vault, AWS Secrets Manager)
- **No audit logging:** Admin actions not tracked in an immutable audit trail
- **Redis without TLS:** Internal communication unencrypted (acceptable on single VPS)

### 18.5 Future Improvements

| Improvement | Priority | Effort | Impact |
|-------------|----------|--------|--------|
| Add Jest/Vitest test suite | High | Large | Regression detection, confidence in changes |
| Implement CI/CD (GitHub Actions) | High | Medium | Automated testing, deployment |
| Add structured logging (Pino) | Medium | Small | Better observability, log aggregation |
| Implement job queue (BullMQ) | Medium | Medium | Async push, uploads, cache warming |
| TypeScript migration (backend) | Medium | Large | Type safety, better IDE support |
| Database migrations (mongoose-migrate) | Medium | Small | Safe schema evolution |
| Request ID correlation | Low | Small | Cross-service log tracing |
| SMS provider integration | Medium | Small | Real OTP delivery |
| Admin audit trail | Low | Medium | Compliance, accountability |
| API rate limiting per user | Low | Small | Prevent individual abuse |

---

## 19. Security

### 19.1 Input Validation

**Zod Schema Validation** (`backend/src/middlewares/validator.js`):
- All request bodies validated against strict Zod schemas
- Rejects unknown fields (strict mode)
- Type coercion for form-data string fields (boolean, arrays)
- Validation errors return structured error messages

**MongoDB Injection Prevention** (`express-mongo-sanitize`):
- Strips `$` and `.` characters from request body/query/params
- Prevents NoSQL injection attacks like `{ "$gt": "" }`

**XSS Sanitization** (custom middleware in `security.js`):
- Strips all HTML tags from string fields in request body
- Regex: `/<[^>]*>?/gm` replaced with empty string
- Prevents stored XSS in captions, bios, usernames

### 19.2 Rate Limiting

**Global Rate Limit** (`express-rate-limit`):
- Window: 15 minutes
- Max requests: 200 per IP
- Applied to all `/api/` routes
- Returns `429 RATE_LIMIT` when exceeded

**Endpoint-Specific Limits:**
| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/v1/auth/otp/send` | 3 requests | 1 hour |
| `POST /api/v1/auth/otp/verify` | 5 requests | 15 minutes |

**Trust Proxy:**
- `app.set('trust proxy', 1)` ensures rate limiter sees real client IP behind Nginx

### 19.3 Authentication Security

- **Short-lived access tokens:** 15 minutes expiry minimizes exposure window
- **Server-side refresh tokens:** Stored in Redis, enabling instant revocation
- **Device-specific sessions:** Each device has independent session lifecycle
- **Banned user blocking:** authGuard checks user status on every request
- **Password hashing:** bcrypt for admin passwords (not stored in plain text)
- **Google token verification:** Official `google-auth-library` validates signatures

### 19.4 HTTP Security Headers (Helmet)

Applied via `helmet()` with custom configuration:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-XSS-Protection` | `0` | Disable browser XSS filter (CSP preferred) |
| `Strict-Transport-Security` | `max-age=...` | Force HTTPS |
| `X-Download-Options` | `noopen` | IE download protection |
| `X-Permitted-Cross-Domain-Policies` | `none` | Block Flash/PDF cross-domain |
| `Referrer-Policy` | `no-referrer` | Privacy protection |

**Content-Security-Policy** is handled separately (not by Helmet):

### 19.5 Content Security Policy (CSP)

**API Routes** (strict):
```
default-src 'none'; frame-ancestors 'none'
```
- Blocks all resource loading (APIs return JSON only)
- Prevents framing/embedding

**Share Pages** (relaxed for media display):
```
default-src 'self'
img-src 'self' data: blob: https: https://res.cloudinary.com https://lh3.googleusercontent.com
media-src 'self' https: https://res.cloudinary.com
style-src 'self' 'unsafe-inline'
script-src 'self' 'unsafe-inline'
font-src 'self' data:
connect-src 'self'
frame-src 'none'
object-src 'none'
```
- Allows Cloudinary images/videos and Google profile pictures
- Inline styles/scripts needed for server-rendered HTML
- `CSP_IMG_SRC` environment variable allows override

### 19.6 CORS Configuration

File: `backend/src/middlewares/security.js`

```javascript
{
  origin: process.env.CORS_ORIGIN.split(',').map(s => s.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id']
}
```

- Configurable allowed origins via environment variable
- Development defaults: `localhost:5173`, `localhost:3000`
- Production: Explicit list of allowed domains
- `credentials: true` for cookie support (future)
- Custom header `X-Device-Id` explicitly allowed

### 19.7 Data Protection

- **Soft delete:** Posts are soft-deleted (recoverable) before permanent deletion
- **Password field protection:** `select: false` on `passwordHash` prevents accidental exposure
- **Minimal data exposure:** Auth middleware loads only `_id`, `role`, `status` (not full user)
- **Response filtering:** Controllers explicitly select fields to return

### 19.8 Secrets Management

Current approach (environment files):
- `.env.development` - Development secrets (not committed)
- `.env.production` - Production secrets (not committed)
- `.env.example` - Template showing required variables (committed)
- Docker Compose `env_file` directive loads into containers

Secrets stored:
- JWT signing keys (min 32 characters)
- Database credentials
- Cloudinary API credentials
- Google OAuth client IDs

### 19.9 Network Security

- **No exposed database ports in production:** Only nginx exposes 80/443
- **Internal Docker network:** Services communicate via `artnepalaya-net` bridge
- **Redis password protection:** Required auth in production
- **MongoDB authentication:** Root user with password
- **HTTPS only:** HTTP redirects to HTTPS in production

---

## 20. Scaling Strategy

### 20.1 Current Architecture Constraints

The platform currently runs on a single VPS with all services co-located. This section outlines the scaling path as user growth demands it.

### 20.2 Immediate Scaling (1K-10K Users)

**Vertical Scaling:**
- Upgrade VPS resources (CPU, RAM)
- PM2 cluster mode already utilizes multiple cores
- Redis handles more connections without changes
- MongoDB handles moderate read/write loads on single instance

**Quick Wins:**
- Increase Redis cache TTLs for feed data
- Add MongoDB read preference `secondaryPreferred` (when replica set added)
- Implement response caching for public endpoints (featured, artwork types, CMS)
- CDN for static admin panel assets (already using Cloudinary for media)

### 20.3 Horizontal Scaling (10K-100K Users)

**Database Layer:**

| Component | Current | Scaled |
|-----------|---------|--------|
| MongoDB | Single instance | Replica Set (1 primary + 2 secondaries) |
| Redis | Single instance | Redis Cluster or Sentinel |
| PostgreSQL | Single instance | Read replicas for analytics |

**Application Layer:**
- Deploy multiple backend containers behind nginx load balancer
- Socket.IO Redis adapter already supports multi-instance
- Stateless design (no server-side session state beyond Redis)

**Caching Strategy Enhancement:**
```
Request -> Nginx Cache (static) -> Redis Cache (dynamic) -> MongoDB
```
- Cache feed results per user with short TTL (30-60 seconds)
- Cache user profiles with longer TTL (5 minutes)
- Cache artwork types, tags, CMS pages (1 hour)
- Invalidation via pub/sub events

### 20.4 Microservices Path (100K+ Users)

Decomposition plan for high-scale:

| Service | Responsibility | Communication |
|---------|---------------|---------------|
| Auth Service | Token management, OAuth, sessions | REST + Redis |
| Feed Service | Ranking engine, feed composition | REST + Redis Cache |
| Media Service | Upload, Cloudinary integration | Async (Queue) |
| Notification Service | Push, email, in-app delivery | Queue (BullMQ) |
| User Service | Profiles, follows, search | REST |
| Moderation Service | Reports, content filtering | Queue |
| Analytics Service | Event tracking, dashboards | PostgreSQL + ClickHouse |
| Gateway | Rate limiting, routing, auth | Nginx/Kong/Express |

### 20.5 Job Queue System (BullMQ)

Priority implementation for async workloads:

| Job | Current | Future |
|-----|---------|--------|
| Push notifications | Synchronous in request | BullMQ worker |
| Cloudinary upload | Synchronous (blocks response) | BullMQ + webhook |
| Cache warming | On-demand | Scheduled BullMQ job |
| Feed precomputation | None | BullMQ periodic job |
| Email delivery | None | BullMQ worker |
| Analytics events | PostgreSQL direct | BullMQ batch insert |

### 20.6 CDN Strategy

**Current:**
- Cloudinary (images/videos) - global CDN already active
- No CDN for API responses

**Future:**
- CloudFront/Fastly for API response caching (feed, explore)
- Edge caching for share page HTML (geographic distribution)
- Asset CDN for admin panel static files

### 20.7 Search Infrastructure

**Current:** MongoDB regex-based search (limited)

**Future (Elasticsearch/Meilisearch):**
- Full-text search on posts (captions, tags)
- User search with fuzzy matching and typo tolerance
- Tag autocomplete with relevance scoring
- Search analytics (popular queries, zero-result tracking)
- Real-time index sync via change streams

### 20.8 Analytics Platform

**Current:** Basic dashboard stats from MongoDB aggregations

**Future:**
- Event streaming (user actions, feed impressions, engagement)
- ClickHouse or BigQuery for analytical queries
- Grafana dashboards for operational metrics
- A/B testing framework for feed algorithm experiments
- Cohort analysis and retention tracking

### 20.9 AI/ML Features

**Content Moderation (Priority):**
- Image classification for NSFW detection (replacing manual flagging)
- Text toxicity detection for captions/reports
- Duplicate/stolen art detection
- Automated report triage

**Recommendations (Enhancement):**
- Collaborative filtering (users who liked X also liked Y)
- Visual similarity (CNN-based image embeddings)
- Personalized explore based on interaction history
- Creator recommendations (similar artists)

**Content Intelligence:**
- Auto-tagging from image analysis
- Artwork style classification
- Art medium detection
- Caption generation suggestions

### 20.10 Monitoring and Observability

**Current:** Container logs + PM2 status

**Future Stack:**
| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection |
| Grafana | Dashboards and alerting |
| Loki | Log aggregation |
| Jaeger | Distributed tracing |
| Sentry | Error tracking |
| UptimeRobot | External health monitoring |

---

## 21. Investor Section

### 21.1 Architecture Strengths

**Production-Ready Infrastructure:**
- Docker-based deployment ensures reproducibility and easy scaling
- PM2 cluster mode maximizes hardware utilization
- Redis caching reduces database load by 60-80% for hot paths
- Socket.IO with Redis adapter provides real-time capabilities at scale
- Cloudinary CDN delivers media globally with sub-second latency

**Modern Technology Choices:**
- Node.js (non-blocking I/O ideal for social platform workloads)
- MongoDB (flexible schema perfect for evolving content types)
- React Native/Expo (single codebase for iOS + Android)
- TypeScript on client (catches bugs before production)

**Separation of Concerns:**
- Monorepo structure enables rapid iteration
- Modular backend (each feature is an isolated module)
- Pluggable feed algorithm (signals can be added/removed without refactoring)
- Admin panel decoupled from user-facing app

### 21.2 Technology Choice Rationale

| Decision | Why | Alternative Considered |
|----------|-----|----------------------|
| Node.js + Express | High concurrency for I/O-bound social feeds, large npm ecosystem | Django, Go |
| MongoDB | Flexible schemas for evolving art metadata, fast reads for feed | PostgreSQL-only |
| React Native (Expo) | 80% code sharing iOS/Android, faster iteration than native | Flutter, Native |
| Cloudinary | Zero-ops media pipeline, global CDN, on-the-fly transforms | S3 + CloudFront |
| Socket.IO | Real-time without infrastructure complexity, automatic fallback | WebSocket raw, Firebase |
| Redis | Sub-millisecond cache, pub/sub, session store in one service | Memcached, DynamoDB |
| Docker Compose | Simple deployment model, scales to multi-host with Swarm/K8s | Kubernetes (premature) |

### 21.3 Scalability Path

```
Current (MVP)              Near-term (6mo)           Long-term (18mo)
-----------------          ------------------        ------------------
Single VPS                 Multi-container VPS       Multi-server cluster
~1K users                  ~10K users                ~100K+ users
$50/mo hosting             $200/mo hosting           $1000+/mo hosting

All-in-one Docker          Separated concerns:       Microservices:
  - 1 backend              - 2-4 backend replicas    - Independent services
  - 1 MongoDB              - MongoDB replica set     - Kubernetes orchestration
  - 1 Redis                - Redis Sentinel          - Elasticsearch search
  - 1 Nginx                - CDN caching             - BullMQ job queues
                           - BullMQ workers          - AI/ML pipelines
                                                     - Multi-region deployment
```

### 21.4 Competitive Advantages

**1. First-Mover in Nepali Art Space:**
- No dedicated platform exists for Nepali art discovery
- Building community network effects before competition arrives
- Deep understanding of local art forms (Thangka, Mandala, Paubha)

**2. Algorithm-Driven Fair Exposure:**
- Multi-signal ranking prevents follower-count dominance
- New creator boost ensures emerging artists get visibility
- 10% exploration slots introduce users to undiscovered content
- Configurable weights allow real-time algorithm tuning

**3. Mobile-First for Nepal Market:**
- 95%+ smartphone users are on Android in Nepal
- Optimized for lower-bandwidth conditions (Cloudinary responsive transforms)
- Offline-tolerant design (optimistic UI updates)
- Push notifications drive re-engagement

**4. Real-Time Social Experience:**
- Socket.IO enables instant feed updates and notification badges
- Live interaction counts (like/save) update without refresh
- Grouped notifications reduce noise while maintaining engagement

**5. Content Moderation Built-In:**
- Report system with admin workflow from day one
- NSFW detection and user-controlled content filtering
- User ban/suspend with immediate feed exclusion
- AI moderation path clearly defined for scale

**6. Extensible Architecture:**
- Plugin-based feed algorithm (add signals without core changes)
- Module-based backend (add features without touching existing code)
- CMS system for dynamic content without deployments
- AppConfig for runtime configuration changes

### 21.5 Market Opportunity

- Nepal has 30M+ population with rapidly growing internet penetration
- Growing middle class interested in art and culture
- No dominant platform for art discovery/commerce in Nepal
- Tourism market creates demand for authentic Nepali art
- Digital art and NFT trends create new artist categories
- Gallery and business roles enable B2B marketplace potential

### 21.6 Revenue Potential

| Revenue Stream | Phase | Model |
|---------------|-------|-------|
| Marketplace Commission | Phase 3 | 10-15% on art sales |
| Featured Placement | Phase 2 | Artists pay for boosted visibility |
| Gallery Subscriptions | Phase 3 | Monthly fee for gallery tools |
| Business Advertising | Phase 4 | Sponsored content in feed |
| Premium Creator Tools | Phase 4 | Analytics, scheduling, insights |
| Event Tickets | Phase 4 | Commission on art event tickets |

### 21.7 Technical Roadmap

**Q3 2025 - Community & Commerce Foundation:**
- Communities feature (group discussions around art styles)
- iOS app launch (Expo makes this low-effort)
- Comment system implementation
- Marketplace preview (listing without payment)

**Q4 2025 - Monetization:**
- Payment gateway integration (eSewa, Khalti for Nepal)
- Marketplace with escrow and commission
- Creator analytics dashboard
- Gallery management tools

**Q1 2026 - Intelligence:**
- AI content moderation (image + text)
- Collaborative filtering for recommendations
- Search infrastructure (Elasticsearch)
- A/B testing framework for feed optimization

**Q2 2026 - Scale:**
- Multi-region deployment
- Advanced analytics (cohort, retention, LTV)
- Creator subscription model
- Live events/streaming integration

### 21.8 Key Metrics (KPIs)

| Metric | Current MVP | 6-Month Target | 12-Month Target |
|--------|-------------|----------------|-----------------|
| Monthly Active Users | Early stage | 5,000 | 25,000 |
| Daily Posts | Growing | 100+ | 500+ |
| Avg. Session Duration | Measuring | 8 min | 12 min |
| D7 Retention | Measuring | 35% | 45% |
| Feed Engagement Rate | Measuring | 15% | 25% |
| Push Open Rate | Measuring | 20% | 30% |

### 21.9 Team Efficiency

The architecture enables a small team to move fast:
- Single codebase (monorepo) for all platforms
- Shared TypeScript types between mobile and admin
- Docker Compose: one command to run entire stack locally
- No infrastructure management (Cloudinary, Expo handle complexity)
- Admin panel enables non-technical content operations
- AppConfig allows algorithm tuning without deployments

---

## Appendix A: Quick Reference

### API Base URL
```
Production: https://api.artnepalaya.com/api/v1
Development: http://localhost:8080/api/v1
```

### Health Check
```bash
curl https://api.artnepalaya.com/health
# {"status":"OK","timestamp":"2025-07-01T00:00:00.000Z"}
```

### Deep Link Scheme
```
artnepalaya://p/{postId}    # Open post
artnepalaya://u/{username}  # Open profile
artnepalaya://c/{id}        # Open community
artnepalaya://e/{id}        # Open event
artnepalaya://m/{id}        # Open marketplace item
```

### Docker Commands (Production)
```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f backend

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Rebuild and deploy
docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d
```

### MongoDB Quick Access
```bash
docker exec -it art_mongodb mongosh --username root --password $MONGO_PASSWORD --authenticationDatabase admin
```

---

*This document is the single source of truth for the Art Nepalaya platform. For questions or updates, maintain this file in the repository root.*
