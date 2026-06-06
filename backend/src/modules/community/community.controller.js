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
