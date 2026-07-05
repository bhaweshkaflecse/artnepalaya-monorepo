# Media Pipeline Audit - Complete Findings

## Summary

The media upload pipeline is **architecturally correct end-to-end**. No media is lost at any stage of the pipeline in the code path. Enhanced logging has been added at every critical point to help diagnose any runtime issues.

---

## Pipeline Stages Verified

### 1. Media Picker (CreateScreen.tsx)

- **selectionLimit**: `Math.max(1, 6 - mediaItems.length)` - correctly allows up to 6 total items
- **allowsMultipleSelection**: `true` - enables multi-select
- **MAX_IMAGES**: 5
- **MAX_VIDEOS**: 1
- **Total max**: 6 files (5 images + 1 video)
- **Verdict**: CORRECT

### 2. FormData Construction (CreateScreen.tsx handlePublish)

- Iterates ALL mediaItems: `for (const item of mediaItems) { ... formData.append('media', mediaAsset as any); }`
- Field name: `'media'` (no brackets)
- ALL items are appended in the loop
- Each item gets proper filename and MIME type
- **Verdict**: CORRECT

### 3. Backend Multer (backend/src/middlewares/upload.js)

- Uses `multer.memoryStorage()`
- Field config: `secureUpload.array('media', 6)` - field name 'media', max 6 files
- File size limit: 100MB
- File count limit: 6
- Accepted MIME types: image/jpeg, image/png, image/webp, image/gif, image/heic, image/heif, video/mp4, video/quicktime
- **Field name matches**: Client sends `'media'`, multer expects `'media'`
- **Verdict**: CORRECT

### 4. Backend Controller (post.controller.js)

- Receives files via `req.files` (populated by multer)
- Maps ALL files through `uploadBufferToCloudinary`
- Uses `Promise.all()` to upload all files in parallel
- Assigns resulting URLs to `postData.media` array
- **Verdict**: CORRECT

### 5. MongoDB Storage (post.service.js / post.model.js)

- Schema: `media: { type: [mediaSchema], required: true }` - no max length enforced
- `Post.create({ authorId: userId, ...postData })` - passes all media items
- **Verdict**: CORRECT

### 6. GET Post Detail (post.controller.js getSinglePost)

- Returns full post document including complete `media` array
- No filtering or truncation of media items
- **Verdict**: CORRECT

### 7. Rendering

| Screen | Component | Data Source | Renders All? | Notes |
|--------|-----------|-------------|--------------|-------|
| Feed (HomeScreen) | PostCard.tsx | `post.media` via FlatList | YES | Full carousel |
| Post Detail | PostDetailScreen.tsx | `post.media` via FlatList | YES | Full carousel |
| Explore | ExploreScreen.tsx | `post.media[0]` | First only | By design (grid thumbnail) |
| Profile | ProfileScreen.tsx | `post.media[0]` | First only | By design (grid thumbnail) |

- **Verdict**: CORRECT - Feed and Detail show all items, grids show first item by design.

---

## Potential Runtime Issues

### React Native FormData Behavior

Some React Native versions have known issues with `formData.append()` using the same field name multiple times. The behavior can vary between:
- iOS vs Android
- Different Expo SDK versions
- Different axios versions

Our code uses `formData.append('media', ...)` in a loop, which is the correct approach for `multer.array('media', 6)`. The field name does NOT need brackets (`media[]`) because multer handles repeated field names natively.

### Network Timeouts

Large multi-file uploads (especially with video) may timeout. The client has a 120s timeout configured. If the upload takes longer, it will appear to fail even though the server may eventually process it.

---

## Enhanced Logging Added

### Client Side (CreateScreen.tsx handlePublish)

```
[PUBLISH] Media items count: <N>
[PUBLISH] Images: <N> Videos: <N>
[PUBLISH] Item 0: type=image, uri=...last30chars..., size=<bytes>
[PUBLISH] FormData items appended: <N>
```

### Server Side (post.controller.js)

```
[CREATE_POST] HIT - user: <userId> files: <N>
[CREATE_POST] File 0: fieldname=media, originalname=<name>, mimetype=<type>, size=<bytes>
[CREATE_POST] Cloudinary upload complete. Media items stored: <N>
[CREATE_POST] Media 0: type=image, url=https://res.cloudinary.com/...
```

### Database Side (post.service.js)

```
[CREATE_POST] Saved to MongoDB. media count: <N>
```

---

## Conclusion

The pipeline is architecturally sound. If users report seeing only 1 image in Post Detail, the most likely causes are:

1. **Rendering pagination**: The carousel FlatList renders all items but pagination dots may not be visible, making users think only 1 image exists
2. **Upload failure**: One or more files may have failed silently during Cloudinary upload (network issue), but the Promise.all would reject entirely in that case
3. **React Native FormData quirk**: In rare cases, FormData may not properly send multiple files with the same key name depending on the RN/Expo version

The enhanced logging will capture the exact count at each stage to pinpoint where media is lost (if it is being lost at all) during actual runtime usage.
