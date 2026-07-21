import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';
import { User } from '../modules/users/user.model.js';
import { Post } from '../modules/posts/post.model.js';
import { Like, Save } from '../modules/posts/post-interaction.model.js';
import { Follow } from '../modules/users/follow.model.js';
import { NotificationGroup } from '../modules/notifications/notificationGroup.model.js';

// Initialize Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function cleanup() {
  const startTime = Date.now();
  console.log(`[Cleanup] Started at ${new Date().toISOString()}`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Cleanup] Connected to MongoDB');

  const expiredUsers = await User.find({
    deletionRequested: true,
    scheduledDeletionAt: { $lte: new Date() }
  });

  console.log(`[Cleanup] Found ${expiredUsers.length} accounts to permanently delete`);

  let successCount = 0;
  let failCount = 0;

  for (const user of expiredUsers) {
    try {
      console.log(`[Cleanup] Processing: ${user.username} (${user._id})`);

      // Delete Cloudinary assets
      const userPosts = await Post.find({ authorId: user._id }).select('media').lean();
      for (const post of userPosts) {
        if (post.media && post.media.length > 0) {
          for (const media of post.media) {
            if (media.providerId) {
              try {
                await cloudinary.uploader.destroy(media.providerId, { resource_type: media.type === 'video' ? 'video' : 'image' });
              } catch (cloudErr) {
                console.warn(`  [Cloudinary] Failed to delete ${media.providerId}:`, cloudErr.message);
              }
            }
          }
        }
      }

      // Delete posts
      await Post.deleteMany({ authorId: user._id });
      // Delete interactions
      await Like.deleteMany({ userId: user._id });
      await Save.deleteMany({ userId: user._id });
      // Delete follow relationships
      await Follow.deleteMany({ $or: [{ followerId: user._id }, { followingId: user._id }] });
      // Delete notifications
      await NotificationGroup.deleteMany({ recipientId: user._id });
      // Delete the user
      await User.findByIdAndDelete(user._id);

      successCount++;
      console.log(`  ✓ Permanently deleted: ${user.username}`);
    } catch (err) {
      failCount++;
      console.error(`  ✗ Failed to delete ${user.username}:`, err.message);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n[Cleanup] Complete. Success: ${successCount}, Failed: ${failCount}`);
  console.log(`[Cleanup] Finished at ${new Date().toISOString()} (took ${duration}s)`);

  await mongoose.disconnect();
  process.exit(0);
}

cleanup().catch(err => {
  console.error('[Cleanup] Fatal error:', err);
  process.exit(0);
});
