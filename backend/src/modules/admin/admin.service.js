import { User } from '../users/user.model.js';
import { Post } from '../posts/post.model.js';
import { Report } from '../reports/report.model.js';
import { FeaturedPost } from './featured.model.js';

/**
 * Escapes special regex characters in a string so it can be safely
 * used inside a RegExp or MongoDB $regex without unintended behavior.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getDashboardStats = async () => {
  const [totalUsers, totalPosts, pendingReports] = await Promise.all([
    User.countDocuments(), Post.countDocuments(), Report.countDocuments({ status: 'Pending' })
  ]);
  return { totalUsers, totalPosts, pendingReports };
};

export const getUsers = async (page, limit) => {
  const skip = (page - 1) * limit;
  const [users, totalItems] = await Promise.all([
    User.find().select('-__v -googleId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments()
  ]);
  return { data: users, meta: { currentPage: page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } };
};

export const updateUserStatus = async (userId, status) => {
  const user = await User.findByIdAndUpdate(userId, { $set: { status } }, { new: true }).lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
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
  const post = await Post.findByIdAndDelete(postId);
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
  await FeaturedPost.findOneAndDelete({ postId });
  return true;
};

export const getFeaturedPosts = async () => {
  return FeaturedPost.find().populate({ path: 'postId', populate: { path: 'authorId', select: 'username avatarUrl' } }).lean();
};

export const addFeaturedPost = async (postId, adminId) => {
  const postExists = await Post.exists({ _id: postId });
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

export const getPosts = async (page = 1, limit = 15, search = '') => {
  const skip = (page - 1) * limit;
  const query = {};
  if (search) {
    const safeSearch = escapeRegex(search);
    query.$or = [
      { caption: { $regex: safeSearch, $options: 'i' } },
      { tags: { $regex: safeSearch, $options: 'i' } }
    ];
  }
  const [posts, totalItems] = await Promise.all([
    Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username avatarUrl')
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
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
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
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$authorId' } },
      { $count: 'total' }
    ]),
    Post.countDocuments({ createdAt: { $gte: today } })
  ]);

  const activeUsersThisWeek = activeUsersResult.length > 0 ? activeUsersResult[0].total : 0;

  return { postsPerDay, activeUsersThisWeek, newPostsToday };
};
