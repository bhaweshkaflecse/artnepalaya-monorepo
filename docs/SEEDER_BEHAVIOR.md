# Seeder Behavior & Architecture

The `seedAll.js` script in ArtNepalaya is designed to be **idempotent**, **non-destructive**, and **production-safe**. 

It guarantees a stable contract:
1. **Bootstrap** a fresh installation.
2. **Safely migrate** existing installations.
3. **Update** static seeded content on subsequent runs without overwriting user interactions.
4. **Never interfere** with production-generated content.

---

## 1. Scope & Operations

### What the seeder creates
- 2 Permanent Super Admin accounts (`admin@artnepalaya.com` and `founder@artnepalaya.com`).
- 55 core users (20 Artists, 10 Galleries, 10 Businesses, 15 Art Lovers).
- 110 starter posts authored by the seeded users.
- 25 sample reports for moderation testing.
- 3 featured posts.
- Global application configuration (`auth_background_media`, `notification_config`).
- 18 assorted notifications.
- 6 essential CMS pages (Privacy Policy, About Us, Terms & Conditions, etc.).
- 1 Global Beta Popup.

### What the seeder updates
The seeder will actively update the **static content** of the entities it manages. If a seeded user's bio has a typo, or if a CMS page needs a legal update, altering `seedAll.js` and re-running it will update the database seamlessly across environments.

### What the seeder NEVER touches
- **Production-generated users, posts, or interactions**: The seeder strictly queries using the hardcoded emails/IDs it expects. It will never accidentally overwrite a real user's profile.
- **Moderation and engagement state**: Once a seeded entity is created, any changes to its moderation status, passwords, or engagement numbers (likes, saves) are strictly preserved.

---

## 2. Field Mutability (`$set` vs `$setOnInsert`)

To achieve safe updates without wiping volatile state, the seeder uses Mongoose's `findOneAndUpdate` by splitting fields into two categories:

### Always Update (`$set`)
These fields are considered "static profiles or content". They will be aggressively updated to match the seeder on every run.
- **Users**: `email`, `username`, `fullName`, `bio`, `role`, `interests`, `avatarUrl`, `isAdult`, `seedSource`
- **Posts**: `authorId`, `media`, `caption`, `tags`, `isHumanMade`, `seedSource`
- **Reports**: `reporterId`, `targetType`, `targetId`, `reason`, `seedSource`
- **App Config**: `key`, `value`, `updatedBy`
- **CMS Pages**: `slug`, `title`, `content`, `updatedBy`, `seedSource`
- **Global Popup**: `heading`, `icon`, `body`, `ctaText`, `ctaLink`, `updatedBy`, `seedSource`
- **Featured Posts**: `postId`, `featuredBy`

### Create Once Only (`$setOnInsert`)
These fields are considered "volatile state". They are initialized only when the document is first created, and are completely ignored on subsequent updates.
- **Passwords**: `passwordHash` (Super Admins keep their passwords after setup).
- **Status/Moderation**: `status` (Users & Reports), `isNsfw` (Posts), `resolvedBy` (Reports), `isActive` (Global Popup).
- **Engagement**: `stats` (followers, following), `likesCount`, `savesCount`, `isRead` (Notifications).

---

## 3. How to Extend the Seeder

### How to add a new seeded artist
1. Open `backend/src/scripts/seedAll.js`.
2. Locate the `buildArtistUsers()` function.
3. Add a new object to the returned array.
4. Ensure the `email` is entirely unique. 
5. Run `npm run seed:all`. The new artist will be inserted, and existing artists will be safely bypassed or updated statically.

### How to add a new seeded CMS page
1. Locate the `cmsPages` array inside `seedAll.js`.
2. Add a new page object containing `slug`, `title`, and `content`.
3. Run `npm run seed:all`.

### How to add a new seeded post
1. Locate the `generatePosts()` function.
2. Push a new post object matching the established schema. Make sure `authorId` maps to one of the seeded users.
3. Run `npm run seed:all`.

### How to add a new Super Admin
1. Open `seedAll.js`.
2. Locate the array `['admin@artnepalaya.com', 'founder@artnepalaya.com']` near the top of the `runSeeder()` function.
3. Add the new email to this array.
4. **Important:** Remember to also append the new email to the `SUPER_ADMIN_EMAILS` list in your `.env.production` file so the backend actually recognizes them as protected.

---

## 4. Workflows

### Safe Production Workflow
Because the seeder is idempotent and segregates volatile fields, it is entirely safe to run in production. 
If you need to push a new terms of service CMS page or fix a typo in the seeded Global Popup:
1. Make the change in `seedAll.js`.
2. Deploy the backend.
3. Execute `npm run seed:all` against the production database.

### Recovery Workflow
If the system state becomes inconsistent during early bootstrap or if you intentionally want to restart from scratch:
1. Manually drop the collections in MongoDB (e.g., `db.users.drop()`).
2. Run `npm run seed:all`.
3. Because all relationships are dynamically established using the generated object instances inside the script, referential integrity will be perfectly restored.

---

## 5. Common Mistakes
- **Putting a volatile field in `$set`**: If you add a field like `banReason` or `isSuspended` to a seeded entity, make sure you put it in `$setOnInsert`. If you put it in `$set`, the seeder will un-ban the user the next time it runs!
- **Changing an identifier**: The seeder relies on fields like `email`, `slug`, or `key` to find the existing document. If you change a seeded user's email in `seedAll.js`, the seeder will treat them as a brand new user and insert them, leaving the old email abandoned.
- **Relying on SEED_ADMIN_PASSWORD**: Login passwords are now managed exclusively via `$setOnInsert` and subsequent database hashes. Do not try to reset Super Admin passwords via the seeder environment variables.
