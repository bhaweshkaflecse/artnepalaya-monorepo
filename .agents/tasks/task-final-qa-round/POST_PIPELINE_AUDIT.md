# Post Publishing Pipeline Audit

## Overview

This document traces the complete lifecycle of media from the user's device gallery through storage and back to rendering on-screen. The audit identifies whether media can be lost at any stage.

---

## The 7-Stage Pipeline

### Stage 1: Media Picker (Mobile Client)

**File:** `mobile/src/screens/create/CreateScreen.tsx` (lines 100-170)

**Configuration:**
```typescript
const MAX_IMAGES = 5;
const MAX_VIDEOS = 1;

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.All,
  allowsMultipleSelection: true,
  selectionLimit: Math.max(1, 6 - mediaItems.length),
  quality: 0.8,
});
```

**Behavior:**
- `allowsMultipleSelection: true` enables multi-select in the device picker
- `selectionLimit` dynamically adjusts based on already-selected items: `Math.max(1, 6 - mediaItems.length)`
- Maximum total: 5 images + 1 video = 6 files
- Per-asset validation: images capped at 10MB, videos at 50MB
- Oversized files are skipped with an alert listing the skipped filenames
- Selected assets are appended to the `mediaItems` state array

**Media loss risk at this stage:** NONE. All valid assets within limits are added to state.

---

### Stage 2: FormData Construction

**File:** `mobile/src/screens/create/CreateScreen.tsx` (lines 252-283)

**Code:**
```typescript
const formData = new FormData();

// Append all media files
for (const item of mediaItems) {
  const filename = item.uri.split('/').pop() || (item.type === 'video' ? 'video.mp4' : 'artwork.jpg');
  const match = /\.(\w+)$/.exec(filename);
  const type = item.type === 'video'
    ? (match ? `video/${match[1]}` : 'video/mp4')
    : (match ? `image/${match[1]}` : 'image/jpeg');

  const mediaAsset = {
    uri: item.uri,
    name: filename,
    type,
  };

  formData.append('media', mediaAsset as any);
}
```

**Behavior:**
- Loops over ALL items in `mediaItems` array
- Each item is appended with field name `'media'` (same key for all, creating a multi-file upload)
- MIME type is inferred from the file extension
- A total size guard (100MB cumulative) runs before the loop starts

**Media loss risk at this stage:** NONE. Every item in `mediaItems` is appended to FormData.

---

### Stage 3: Multer (Server Middleware)

**File:** `backend/src/middlewares/upload.js`

**Configuration:**
```javascript
export const secureUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,  // accepts JPEG, PNG, WebP, GIF, HEIC, HEIF, MP4, MOV
  limits: { fileSize: 100 * 1024 * 1024, files: 6 },
});
```

**Route usage** (`backend/src/modules/posts/post.routes.js`, line 27):
```javascript
router.post(
  '/',
  secureUpload.array('media', 6),
  handleUploadErrors,
  validate(validation.createPostSchema),
  controller.createPost
);
```

**Behavior:**
- `secureUpload.array('media', 6)` accepts up to 6 files under field name `'media'`
- Files are stored in memory (RAM buffers)
- File filter rejects unsupported MIME types with a 400 error
- `LIMIT_FILE_COUNT` error triggers if more than 6 files are sent
- `LIMIT_FILE_SIZE` error triggers if any single file exceeds 100MB

**Media loss risk at this stage:** NONE. All valid files within limits are stored in `req.files` array.

---

### Stage 4: Cloudinary Upload

**File:** `backend/src/modules/posts/post.controller.js` (lines 20-50)

**Code:**
```javascript
let uploadedFiles = [];

if (req.files && req.files.length > 0) uploadedFiles = req.files;
else if (req.file) uploadedFiles = [req.file];

if (uploadedFiles.length > 0) {
  const uploadPromises = uploadedFiles.map(async (file) => {
    const cloudResult = await uploadBufferToCloudinary(file.buffer, file.isAppVideo);
    return {
      url: cloudResult.secure_url,
      providerId: cloudResult.public_id,
      type: file.isAppVideo ? 'video' : 'image'
    };
  });

  postData.media = await Promise.all(uploadPromises);
}
```

**Behavior:**
- Maps over ALL files in `req.files` (or single `req.file`)
- Each buffer is streamed to Cloudinary via `upload_stream`
- `resource_type` is set to `'video'` or `'image'` based on `file.isAppVideo` (set by multer fileFilter)
- `Promise.all()` waits for ALL uploads to complete
- Result array of `{ url, providerId, type }` objects is assigned to `postData.media`

**Media loss risk at this stage:** NONE. All files from multer are uploaded. If any single upload fails, the entire `Promise.all()` rejects and the request returns a 500 error (no partial save).

---

### Stage 5: MongoDB Storage

**File:** `backend/src/modules/posts/post.service.js` - `createPost()` (line 31)
**File:** `backend/src/modules/posts/post.model.js` - Schema definition

**Model schema:**
```javascript
const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  providerId: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], required: true }
}, { _id: false });

const postSchema = new mongoose.Schema({
  media: { type: [mediaSchema], required: true },
  // ... other fields
});
```

**Service code:**
```javascript
const post = await Post.create({ authorId: userId, ...postData });
```

**Behavior:**
- `postData.media` (the full array from Stage 4) is spread into the create call
- `media` field is `required: true` and typed as `[mediaSchema]` (array of media objects)
- MongoDB stores the complete array as-is
- No truncation, filtering, or limit on array length at the schema level

**Media loss risk at this stage:** NONE. The full media array is persisted.

---

### Stage 6: GET API (Retrieval)

**File:** `backend/src/modules/posts/post.service.js`

**getSinglePost** (line 65):
```javascript
const post = await Post.findById(postId)
  .populate('authorId', 'username avatarUrl role isVerified verifiedType status')
  .lean();
```

**getFeed** (line 92+):
```javascript
let posts = await Post.find(query)
  .sort({ _id: -1 })
  .limit(fetchLimit)
  .populate('authorId', 'username avatarUrl role isVerified verifiedType')
  .lean();
```

**Behavior:**
- Both queries use `.lean()` which returns plain objects
- No `.select()` is used to filter fields, so ALL fields are returned including the full `media` array
- No projection or transformation removes media items from the response

**Media loss risk at this stage:** NONE. The full `media` array is returned in API responses.

---

### Stage 7: Rendering (Mobile Client)

#### Feed (PostCard)

**File:** `mobile/src/components/home/PostCard.tsx` (line 356-357)

```typescript
<FlatList
  data={post.media}
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  decelerationRate="fast"
  renderItem={renderMediaItem}
/>
```

- Renders ALL items in `post.media` as horizontally swipeable pages
- Pagination dots shown when `post.media.length > 1`
- Media count badge shows total count (layers icon + number)

**Media loss at this stage:** NONE. All media items are rendered.

#### Post Detail

**File:** `mobile/src/screens/post/PostDetailScreen.tsx` (line 448-449)

```typescript
<FlatList
  data={post.media}
  horizontal
  pagingEnabled
  snapToInterval={screenWidth}
  decelerationRate="fast"
  renderItem={...}
/>
```

- Same pattern as Feed: all media rendered as full-width swipeable pages
- Supports both images and videos (video has play/pause controls)
- `initialScrollIndex` allows deep-linking to a specific media item

**Media loss at this stage:** NONE. All media items are rendered.

#### Profile Grid

**File:** `mobile/src/screens/profile/ProfileScreen.tsx` (line 147-149)

```typescript
const imageUrl = isVideo && item.media[0]?.url
  ? getVideoThumbnailUrl(item.media[0].url)
  : getPrimaryImageUrl(item.media || []);
```

**File:** `mobile/src/utils/media.ts` (line 25)

```typescript
export function getPrimaryImageUrl(media: PostMedia[]): string | undefined {
  const primary = getPrimaryImage(media);
  return primary?.url;
}
```

- Profile grid shows ONLY the first image as a thumbnail
- **This is intentional and by design** for grid layout (Instagram-style grid)
- Tapping the thumbnail navigates to PostDetail which shows ALL media

**Media loss at this stage:** NOT a loss. This is a deliberate UI decision for grid thumbnails.

#### Explore Grid

**File:** `mobile/src/screens/explore/ExploreScreen.tsx` (line 211)

```typescript
const imageUrl = firstMedia?.type === 'video'
  ? getVideoThumbnailUrl(firstMedia.url)
  : getPrimaryImageUrl(item.media);
```

- Same as Profile: shows only first media item as grid thumbnail
- Tapping navigates to full PostDetail with all media
- **Intentional design choice** for masonry/grid layout

**Media loss at this stage:** NOT a loss. Deliberate thumbnail behavior.

---

## Verdict

### NO media loss occurs at any stage in the pipeline.

All media items flow correctly from picker through storage through rendering:

| Stage | Input | Output | Loss? |
|-------|-------|--------|-------|
| 1. Picker | User selection | `mediaItems[]` state | No |
| 2. FormData | `mediaItems[]` | `formData` with N files | No |
| 3. Multer | HTTP multipart | `req.files[]` in memory | No |
| 4. Cloudinary | `req.files[]` buffers | `postData.media[]` URLs | No |
| 5. MongoDB | `postData.media[]` | Persisted `post.media[]` | No |
| 6. GET API | DB document | Full `media[]` in response | No |
| 7. Rendering | API response `media[]` | FlatList with all items | No |

---

## If User Reports Seeing Only 1 Image

If a user sees only one image in Post Detail, the likely causes are:

1. **Post created before multi-media support was deployed** - older posts in the database genuinely have only 1 media item in their `media` array because they were uploaded when the system only supported single-file upload.

2. **Viewing the Profile Grid or Explore Grid** - these screens intentionally display only the first image as a thumbnail. This is by design (Instagram-style grid). Tapping the thumbnail opens the full PostDetail with all media.

3. **Pagination dots not noticed** - when multiple media exist, pagination dots appear below the image. On the first visit the FlatList shows the first item; the user must swipe horizontally to see additional items.

4. **Network issue during upload** - if the upload request failed partway, `Promise.all()` in the controller would reject entirely, returning a server error. The post would NOT be created with partial media. The user would see an error and could retry.

---

## Key Files Referenced

| Stage | File Path | Key Function/Config |
|-------|-----------|-------------------|
| 1 | `mobile/src/screens/create/CreateScreen.tsx` | `pickImage()`, `MAX_IMAGES=5`, `MAX_VIDEOS=1` |
| 2 | `mobile/src/screens/create/CreateScreen.tsx` | `handlePublish()`, FormData loop |
| 3 | `backend/src/middlewares/upload.js` | `secureUpload.array('media', 6)`, `limits: { files: 6 }` |
| 3 | `backend/src/modules/posts/post.routes.js` | Route: `router.post('/', secureUpload.array('media', 6), ...)` |
| 4 | `backend/src/modules/posts/post.controller.js` | `createPost()`, `uploadBufferToCloudinary()`, `Promise.all()` |
| 5 | `backend/src/modules/posts/post.service.js` | `createPost()` - `Post.create()` |
| 5 | `backend/src/modules/posts/post.model.js` | `media: { type: [mediaSchema], required: true }` |
| 6 | `backend/src/modules/posts/post.service.js` | `getSinglePost()`, `getFeed()` - no field projection |
| 7 | `mobile/src/components/home/PostCard.tsx` | `FlatList data={post.media}` |
| 7 | `mobile/src/screens/post/PostDetailScreen.tsx` | `FlatList data={post.media}` |
| 7 | `mobile/src/screens/profile/ProfileScreen.tsx` | `getPrimaryImageUrl()` (first image only, by design) |
| 7 | `mobile/src/screens/explore/ExploreScreen.tsx` | `getPrimaryImageUrl()` (first image only, by design) |
| 7 | `mobile/src/utils/media.ts` | `getPrimaryImageUrl()`, `getPrimaryImage()` helpers |
