import { User } from '../../modules/users/user.model.js';

/**
 * getInactiveUserIds - Returns IDs of banned/suspended users for query-level filtering.
 * Used by both the main feed and recommendation engine to exclude inactive users.
 *
 * @returns {Promise<Array>} Array of ObjectIds for banned/suspended users
 */
export const getInactiveUserIds = async () => {
  const users = await User.find({ 
    $or: [
      { status: { $in: ['banned', 'suspended'] } },
      { deletionRequested: true }
    ]
  }).select('_id').lean();
  return users.map(u => u._id);
};
