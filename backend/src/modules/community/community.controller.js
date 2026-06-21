import { CommunityWaitlist } from './communityWaitlist.model.js';

export const joinWaitlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const existing = await CommunityWaitlist.findOne({ userId });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Already on the waitlist!' });
    }
    await CommunityWaitlist.create({ userId });
    return res.status(201).json({ success: true, message: 'You have been added to the waitlist!' });
  } catch (error) {
    next(error);
  }
};

export const getWaitlistCount = async (req, res, next) => {
  try {
    const count = await CommunityWaitlist.countDocuments();
    return res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

export const registerInterest = async (req, res, next) => {
  try {
    const { deviceId, type: interestType } = req.body;
    const type = ['community', 'marketplace'].includes(interestType) ? interestType : 'community';

    // Authenticated user
    if (req.user) {
      const userId = req.user.id;
      const existing = await CommunityWaitlist.findOne({ userId, type });
      if (existing) {
        return res.status(200).json({ success: true, message: 'Already registered interest!' });
      }
      await CommunityWaitlist.create({
        userId,
        email: req.user.email,
        username: req.user.username,
        type
      });
      return res.status(201).json({ success: true, message: 'Interest registered successfully!' });
    }

    // Guest user (unauthenticated)
    if (!deviceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'deviceId is required for guest registrations' } });
    }
    const existing = await CommunityWaitlist.findOne({ deviceId, type });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Already registered interest!' });
    }
    await CommunityWaitlist.create({ deviceId, type });
    return res.status(201).json({ success: true, message: 'Interest registered successfully!' });
  } catch (error) {
    next(error);
  }
};

export const getInterestUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const typeFilter = req.query.type;
    const query = typeFilter ? { type: typeFilter } : {};

    const [users, totalItems, communityCount, marketplaceCount] = await Promise.all([
      CommunityWaitlist.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email')
        .lean(),
      CommunityWaitlist.countDocuments(query),
      CommunityWaitlist.countDocuments({ type: 'community' }),
      CommunityWaitlist.countDocuments({ type: 'marketplace' })
    ]);
    res.status(200).json({
      success: true,
      data: users,
      meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit), communityCount, marketplaceCount }
    });
  } catch (error) {
    next(error);
  }
};

export const getInterestAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      communityTotal,
      communityLast7Days,
      communityLast30Days,
      marketplaceTotal,
      marketplaceLast7Days,
      marketplaceLast30Days,
    ] = await Promise.all([
      CommunityWaitlist.countDocuments({ type: 'community' }),
      CommunityWaitlist.countDocuments({ type: 'community', createdAt: { $gte: sevenDaysAgo } }),
      CommunityWaitlist.countDocuments({ type: 'community', createdAt: { $gte: thirtyDaysAgo } }),
      CommunityWaitlist.countDocuments({ type: 'marketplace' }),
      CommunityWaitlist.countDocuments({ type: 'marketplace', createdAt: { $gte: sevenDaysAgo } }),
      CommunityWaitlist.countDocuments({ type: 'marketplace', createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        community: { total: communityTotal, last7Days: communityLast7Days, last30Days: communityLast30Days },
        marketplace: { total: marketplaceTotal, last7Days: marketplaceLast7Days, last30Days: marketplaceLast30Days },
      },
    });
  } catch (error) {
    next(error);
  }
};
