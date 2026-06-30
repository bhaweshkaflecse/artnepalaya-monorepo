import { User } from '../users/user.model.js';
import { Post } from '../posts/post.model.js';
import { Report } from '../reports/report.model.js';
import { FeaturedPost } from './featured.model.js';
import { SearchLog } from './searchLog.model.js';
import { Like, Save } from '../posts/post-interaction.model.js';
import { Notification } from '../notifications/notification.model.js';
import { v2 as cloudinary } from 'cloudinary';
import { invalidateCache } from '../../shared/utils/cache.js';

/**
 * Escapes special regex characters in a string so it can be safely
 * used inside a RegExp or MongoDB $regex without unintended behavior.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getDashboardStats = async () => {
  const [totalUsers, totalPosts, pendingReports] = await Promise.all([
    User.countDocuments(), Post.countDocuments({ deletedAt: null }), Report.countDocuments({ status: 'Pending' })
  ]);
  return { totalUsers, totalPosts, pendingReports };
};

export const getUsers = async (page, limit, search) => {
  const skip = (page - 1) * limit;
  const filter = {};
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { username: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
      { fullName: { $regex: safeSearch, $options: 'i' } }
    ];
  }
  const [users, totalItems] = await Promise.all([
    User.find(filter).select('-__v -googleId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter)
  ]);
  return { data: users, meta: { currentPage: page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } };
};

export const updateUserStatus = async (userId, status) => {
  const user = await User.findByIdAndUpdate(userId, { $set: { status } }, { new: true }).lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));
  return user;
};

export const getReports = async (statusFilter, page, limit) => {
  const skip = (page - 1) * limit;
  const query = statusFilter ? { status: statusFilter } : {};
  const [reports, totalItems] = await Promise.all([
    Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reporterId', 'username email').lean(),
    Report.countDocuments(query)
  ]);
  return { data: reports, meta: { currentPage: page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } };
};

export const resolveReport = async (reportId, adminId) => {
  const report = await Report.findByIdAndUpdate(reportId, { $set: { status: 'Resolved', resolvedBy: adminId } }, { new: true });
  if (!report) throw Object.assign(new Error('Report not found'), { status: 404 });
  return report;
};

export const deletePost = async (postId) => {
  const post = await Post.findById(postId);
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });

  // Clean up Cloudinary assets
  const destroyPromises = post.media.map(m =>
    cloudinary.uploader.destroy(m.providerId, { resource_type: m.type === 'video' ? 'video' : 'image' }).catch(err => console.error('Cloudinary destroy failed:', err))
  );
  await Promise.all(destroyPromises);

  // Cascade delete all related data
  await Promise.all([
    Post.findByIdAndDelete(postId),
    Like.deleteMany({ postId }),
    Save.deleteMany({ postId }),
    Notification.deleteMany({ postId }),
    FeaturedPost.findOneAndDelete({ postId }),
    Report.deleteMany({ targetId: postId }),
  ]);

  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));

  return true;
};

export const softDeletePost = async (postId) => {
  const post = await Post.findByIdAndUpdate(postId, { $set: { deletedAt: new Date() } }, { new: true });
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));
  return true;
};

export const restorePost = async (postId) => {
  const post = await Post.findByIdAndUpdate(postId, { $set: { deletedAt: null } }, { new: true });
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));
  return post;
};

export const getFeaturedPosts = async () => {
  const now = new Date();
  const results = await FeaturedPost.find({
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
  })
    .sort({ sortOrder: 1 })
    .populate({ path: 'postId', populate: { path: 'authorId', select: 'username avatarUrl' } })
    .lean();

  // Filter out entries where the populated post has been soft-deleted
  return results.filter((entry) => entry.postId && !entry.postId.deletedAt);
};

export const addFeaturedPost = async (postId, adminId) => {
  const postExists = await Post.exists({ _id: postId, deletedAt: null });
  if (!postExists) throw Object.assign(new Error('Post not found'), { status: 404 });

  const currentCount = await FeaturedPost.countDocuments();
  if (currentCount >= 3) throw Object.assign(new Error('Maximum 3 featured posts allowed'), { status: 400 });

  try {
    await FeaturedPost.create({ postId, featuredBy: adminId });
    return true;
  } catch (err) {
    if (err.code === 11000) throw Object.assign(new Error('Post is already featured'), { status: 409 });
    throw err;
  }
};

export const removeFeaturedPost = async (postId) => {
  await FeaturedPost.findOneAndDelete({ postId });
  return true;
};

export const getPosts = async (page = 1, limit = 15, search = '', deleted = false) => {
  const skip = (page - 1) * limit;
  const query = {};

  // Filter by soft-delete status
  if (deleted) {
    query.deletedAt = { $ne: null };
  } else {
    query.deletedAt = null;
  }

  if (search) {
    const safeSearch = escapeRegex(search);
    query.$or = [
      { caption: { $regex: safeSearch, $options: 'i' } },
      { tags: { $regex: safeSearch, $options: 'i' } }
    ];
    if (/^[0-9a-fA-F]{24}$/.test(search)) {
      query.$or.push({ _id: search });
    }
  }
  const [posts, totalItems] = await Promise.all([
    Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username avatarUrl isVerified verifiedType')
      .lean(),
    Post.countDocuments(query)
  ]);
  return { data: posts, meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } };
};

export const getAnalytics = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [postsPerDay, activeUsersResult, newPostsToday] = await Promise.all([
    Post.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, deletedAt: null } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } }
    ]),
    Post.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, deletedAt: null } },
      { $group: { _id: '$authorId' } },
      { $count: 'total' }
    ]),
    Post.countDocuments({ createdAt: { $gte: today }, deletedAt: null })
  ]);

  const activeUsersThisWeek = activeUsersResult.length > 0 ? activeUsersResult[0].total : 0;

  return { postsPerDay, activeUsersThisWeek, newPostsToday };
};

export const getFeedAnalytics = async () => {
  const [mostLikedPosts, mostSavedPosts, mostFollowedArtists] = await Promise.all([
    Post.find({ deletedAt: null })
      .sort({ likesCount: -1 })
      .limit(5)
      .populate('authorId', 'username avatarUrl isVerified verifiedType')
      .select('caption media likesCount authorId')
      .lean(),
    Post.find({ deletedAt: null })
      .sort({ savesCount: -1 })
      .limit(5)
      .populate('authorId', 'username avatarUrl isVerified verifiedType')
      .select('caption media savesCount authorId')
      .lean(),
    User.find()
      .sort({ 'stats.followers': -1 })
      .limit(5)
      .select('username avatarUrl stats.followers isVerified verifiedType')
      .lean()
  ]);

  return { mostLikedPosts, mostSavedPosts, mostFollowedArtists };
};

export const updateFeaturedOrder = async (postId, sortOrder) => {
  const featured = await FeaturedPost.findOneAndUpdate(
    { postId },
    { $set: { sortOrder } },
    { new: true }
  );
  if (!featured) throw Object.assign(new Error('Featured post not found'), { status: 404 });
  return featured;
};

export const updateFeaturedExpiry = async (postId, expiresAt) => {
  const featured = await FeaturedPost.findOneAndUpdate(
    { postId },
    { $set: { expiresAt: expiresAt || null } },
    { new: true }
  );
  if (!featured) throw Object.assign(new Error('Featured post not found'), { status: 404 });
  return featured;
};

export const getSearchInsights = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [topSearches, trending] = await Promise.all([
    SearchLog.find().sort({ count: -1 }).limit(50).lean(),
    SearchLog.find({ lastSearchedAt: { $gte: sevenDaysAgo } })
      .sort({ count: -1 })
      .limit(20)
      .lean()
  ]);

  return { topSearches, trending };
};

export const updateReportNotes = async (reportId, notes) => {
  const report = await Report.findByIdAndUpdate(
    reportId,
    { $set: { adminNotes: notes } },
    { new: true }
  );
  if (!report) throw Object.assign(new Error('Report not found'), { status: 404 });
  return report;
};

