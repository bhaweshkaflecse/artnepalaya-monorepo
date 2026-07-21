import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { User } from '../modules/users/user.model.js';
import { Post } from '../modules/posts/post.model.js';
import { Like, Save } from '../modules/posts/post-interaction.model.js';
import { Follow } from '../modules/users/follow.model.js';
import { NotificationGroup } from '../modules/notifications/notificationGroup.model.js';

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  
  const expiredUsers = await User.find({
    deletionRequested: true,
    scheduledDeletionAt: { $lte: new Date() }
  });
  
  console.log(`Found ${expiredUsers.length} accounts to permanently delete`);
  
  for (const user of expiredUsers) {
    console.log(`Deleting user: ${user.username} (${user._id})`);
    
    // Delete user's posts
    await Post.deleteMany({ authorId: user._id });
    // Delete likes/saves by this user
    await Like.deleteMany({ userId: user._id });
    await Save.deleteMany({ userId: user._id });
    // Delete follow relationships
    await Follow.deleteMany({ $or: [{ followerId: user._id }, { followingId: user._id }] });
    // Delete notifications
    await NotificationGroup.deleteMany({ recipientId: user._id });
    // Delete the user document
    await User.findByIdAndDelete(user._id);
    
    console.log(`  ✓ Permanently deleted: ${user.username}`);
  }
  
  console.log('Cleanup complete');
  await mongoose.disconnect();
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
