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
    const { deviceId } = req.body;

    // Authenticated user
    if (req.user) {
      const userId = req.user.id;
      const existing = await CommunityWaitlist.findOne({ userId });
      if (existing) {
        return res.status(200).json({ success: true, message: 'Already registered interest!' });
      }
      await CommunityWaitlist.create({
        userId,
        email: req.user.email,
        username: req.user.username,
        source: 'community'
      });
      return res.status(201).json({ success: true, message: 'Interest registered successfully!' });
    }

    // Guest user (unauthenticated)
    if (!deviceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'deviceId is required for guest registrations' } });
    }
    const existing = await CommunityWaitlist.findOne({ deviceId });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Already registered interest!' });
    }
    await CommunityWaitlist.create({ deviceId, source: 'community' });
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
    const [users, totalItems] = await Promise.all([
      CommunityWaitlist.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email')
        .lean(),
      CommunityWaitlist.countDocuments()
    ]);
    res.status(200).json({
      success: true,
      data: users,
      meta: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) }
    });
  } catch (error) {
    next(error);
  }
};
