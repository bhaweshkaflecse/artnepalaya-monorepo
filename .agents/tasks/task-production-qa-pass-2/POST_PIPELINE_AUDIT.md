# Post Publishing Pipeline Audit - Media Flow Analysis

## Overview

This document traces the complete lifecycle of media (images and videos) from selection on the mobile device through upload, storage, retrieval, and rendering. The goal is to identify where media could potentially be lost.

---

## Stage 1: PICKER (Mobile)

**File:** `mobile/src/screens/create/CreateScreen.tsx`

**Configuration:**
```javascript
ImagePicker.launchImageLibraryAsync({
  allowsMultipleSelection: true,
  selectionLimit: Math.max(1, 6 - mediaItems.length),
  mediaTypes: ImagePicker.MediaTypeOptions.All,
  quality: 0.8,
})
```

**Limits:**
- `MAX_IMAGES = 5`
- `MAX_VIDEOS = 1`
- Total media slots: 6 (5 images + 1 video)
- `selectionLimit` dynamically adjusts based on already-selected items: `Math.max(1, 6 - mediaItems.length)`

**Validation:**
- File size checks: 10MB per image, 50MB per video
- Items exceeding size limits are rejected with user-facing error
- Video count is enforced (max 1 video total)

**Verdict:** NO LOSS at this stage. The picker correctly collects all selected items up to the limit.

---

## Stage 2: FORMDATA Construction (Mobile)

**File:** `mobile/src/screens/create/CreateScreen.tsx`

**Process:**
- All media items are iterated and appended to FormData under the key `'media'`
- For each item:
  - `uri`: the local file URI
  - `name`: derived from URI via `.split('/').pop()` (extracts filename)
  - `type`: MIME type inferred from file extension (e.g., `image/jpeg`, `video/mp4`)

**Additional FormData fields:**
- `caption` (string)
- `tags[]` (array, each tag appended separately)
- `artworkType` (JSON stringified)
- `isHumanMade` (boolean string)
- `isAIGenerated` (boolean string)
- `isOriginalContent` (boolean string)
- `isNsfw` (boolean string)

**Verdict:** NO LOSS at this stage. Every item in the `mediaItems` array is appended to FormData. The loop processes ALL items without filtering.

---

## Stage 3: MULTER (Backend)

**File:** `backend/src/middlewares/upload.js`

**Configuration:**
```javascript
const secureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 6                      // max 6 files total
  },
  fileFilter: (req, file, cb) => {
    // Accepts: JPEG, PNG, WebP, GIF, HEIC, HEIF (images)
    //          MP4, MOV (videos)
  }
});

// Used as: secureUpload.array('media', 6)
```

**Behavior:**
- `memoryStorage()` stores files in memory as Buffer objects
- `.array('media', 6)` accepts up to 6 files from the `'media'` field
- File filter validates MIME types -- rejects unsupported formats
- Files that pass validation are available at `req.files`

**Verdict:** NO LOSS at this stage for valid files. Multer accepts up to 6 files matching the mobile's maximum. MIME type validation is consistent with what the mobile sends.

---

## Stage 4: CLOUDINARY Upload (Backend)

**File:** `backend/src/controllers/post.controller.js`

**Process:**
```javascript
const mediaUploadPromises = req.files.map(file => {
  const isAppVideo = file.mimetype.startsWith('video/');
  return uploadBufferToCloudinary(file.buffer, {
    folder: 'art_nepalaya_posts',
    resource_type: isAppVideo ? 'video' : 'image'
  });
});

const mediaResults = await Promise.all(mediaUploadPromises);
```

**Returns per file:**
```javascript
{
  url: result.secure_url,
  providerId: result.public_id,
  type: isAppVideo ? 'video' : 'image'
}
```

**Key behavior:**
- Maps ALL `req.files` to upload promises
- Uses `Promise.all()` - if ANY single upload fails, the entire array rejects
- No partial success handling -- either all uploads succeed or the entire post creation fails

**Verdict:** NO LOSS for successful posts. If the post was created successfully (HTTP 201), ALL files were uploaded to Cloudinary. However, if one upload fails (timeout, Cloudinary error), `Promise.all` rejects and no post is created at all.

**POTENTIAL ISSUE:** Network timeouts during parallel uploads could cause the entire post creation to fail silently on the mobile side if error handling is insufficient. But this would result in NO post, not a post with missing media.

---

## Stage 5: MONGODB Storage

**File:** `backend/src/models/Post.js`

**Schema:**
```javascript
const mediaSchema = new Schema({
  url: { type: String, required: true },
  providerId: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], required: true }
});

// In Post schema:
media: [mediaSchema]
```

**Storage:**
- The `media` array from Cloudinary results is assigned directly to the Post document
- All items from `mediaResults` are stored in the `media` field
- No filtering or transformation occurs between Cloudinary response and MongoDB storage

**Verdict:** NO LOSS at this stage. The full media array is stored as-is.

---

## Stage 6: GET API (Retrieval)

**File:** `backend/src/controllers/post.controller.js`

**Endpoints:**
- `getSinglePost`: `Post.findById(id).populate('authorId', ...).lean()` -- returns full post with complete media array
- `getFeed`: Returns posts with pagination, each post includes full media array
- `getUserPosts`: Same pattern, full media array included

**Behavior:**
- `.lean()` returns plain JavaScript objects (no Mongoose document overhead)
- No projection is used that would exclude the `media` field
- The full `media` array is serialized in the JSON response

**Verdict:** NO LOSS at this stage. The API returns the complete media array for every post.

---

## Stage 7: RENDERING (Mobile)

### Feed View (`PostCard.tsx`)
```javascript
<FlatList
  data={post.media}
  horizontal
  pagingEnabled
  // renders ALL items in horizontal carousel
/>
```
**Renders:** ALL media items in a swipeable horizontal carousel.

### Post Detail (`PostDetailScreen.tsx`)
```javascript
<FlatList
  data={post.media}
  horizontal
  pagingEnabled
  // renders ALL items with pagination dots
/>
```
**Renders:** ALL media items with carousel and pagination dots indicator.

### Profile Grid (`ProfileScreen.tsx`)
```javascript
getPrimaryImageUrl(item.media) // shows FIRST image only
```
**Renders:** Only the FIRST media item as a grid thumbnail. This is intentional grid behavior.

### Explore Grid (`ExploreScreen.tsx`)
```javascript
const firstMedia = item.media?.[0]; // shows FIRST media only
```
**Renders:** Only the FIRST media item as a grid thumbnail. This is intentional grid behavior.

### Featured Section (`FeaturedSection.tsx`)
```javascript
getPrimaryImageUrl(item.media) // shows FIRST image only
```
**Renders:** Only the FIRST media item. This is intentional for featured cards.

**Verdict:** NO LOSS in detail views. Feed and Post Detail render ALL media items via FlatList. Profile, Explore, and Featured grids intentionally show only the first image as a thumbnail (standard grid UX pattern, not a bug).

---

## Potential Loss Points Summary

| Stage | Can Media Be Lost? | Details |
|-------|-------------------|---------|
| 1. Picker | No | Correctly collects all selected items |
| 2. FormData | No | Appends all items to 'media' key |
| 3. Multer | No | Accepts up to 6, matches mobile limit |
| 4. Cloudinary | Partial* | Promise.all rejects entirely on single failure |
| 5. MongoDB | No | Stores full array from Cloudinary results |
| 6. GET API | No | Returns full media array via lean() |
| 7. Rendering | No** | FlatList renders all in detail/feed views |

*If one Cloudinary upload fails, the ENTIRE post creation fails (no post is created at all, not a post with missing media).

**Grid views (Profile, Explore, Featured) intentionally show only the first image as thumbnails.

---

## Conclusion

**The pipeline is correctly wired end-to-end for multi-media posts.** There is no stage where media items are silently dropped or lost.

If a user reports seeing only 1 image in the Post Detail view, the possible causes are:

1. **The post was created with only 1 media item** - The user's picker selection only included 1 file (most common case)
2. **Cloudinary upload partially failed** - Since `Promise.all` is used, if any single upload fails, the entire post creation should fail. However, if there's a race condition or timeout that causes a partial response, it could theoretically result in fewer items. This would be extremely rare.
3. **Network timeout during upload** - Uploads run in parallel. A slow connection could cause the HTTP request itself to timeout on the mobile side, while the backend might still be processing. The user would see an error, but if they refresh and find a post, it may have been created with whatever files completed before the timeout.
4. **Confusion with grid views** - The user may be looking at the Profile or Explore grid (which intentionally shows only the first image) and mistaking it for the detail view.

### Recommendations for Debugging

If this issue is reported again:
1. Check the `media` array length in MongoDB for the specific post (`db.posts.findOne({_id: postId}).media.length`)
2. Compare with what the user claims they selected
3. Check backend logs for Cloudinary upload errors around the post creation timestamp
4. Verify the user is looking at Post Detail (with carousel/pagination dots) and not a grid thumbnail
