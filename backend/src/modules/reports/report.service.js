import { Report } from './report.model.js';

export const submitReport = async (userId, payload) => {
  try {
    return await Report.create({
      reporterId: userId, targetType: payload.targetType, targetId: payload.targetId,
      reason: payload.reason, details: payload.details
    });
  } catch (err) {
    if (err.code === 11000) return true; // Already reported
    throw err;
  }
};