import { AppConfig } from '../admin/appConfig.model.js';

/**
 * Default notification configuration values.
 * These are used as fallback if no AppConfig entry exists in the database.
 */
const DEFAULT_CONFIG = {
  groupingWindows: {
    Like: 86400000,       // 24 hours in ms
    Save: 86400000,       // 24 hours in ms
    Follow: 86400000      // 24 hours in ms
  },
  pushCooldowns: {
    Like: 300000,          // 5 minutes in ms
    Save: 600000,          // 10 minutes in ms
    Follow: 600000,        // 10 minutes in ms
    AdminBroadcast: 0,     // immediate
    Comment: 300000        // 5 minutes in ms
  },
  maxRecentActors: 5,
  displayThresholds: {
    showNames: 2,            // up to 2 actors: show all names
    showNamesAndOthers: 20   // above 2 up to 20: show names + "and X others"
  }
};

/**
 * Load notification configuration from AppConfig (key: 'notification_config'),
 * merging with hardcoded defaults so the system works even without a DB entry.
 *
 * @returns {Promise<object>} Merged notification config
 */
export async function getNotificationConfig() {
  try {
    const configDoc = await AppConfig.findOne({ key: 'notification_config' }).lean();

    if (!configDoc || !configDoc.value) {
      return { ...DEFAULT_CONFIG };
    }

    const dbValue = configDoc.value;

    return {
      groupingWindows: {
        ...DEFAULT_CONFIG.groupingWindows,
        ...(dbValue.groupingWindows || {})
      },
      pushCooldowns: {
        ...DEFAULT_CONFIG.pushCooldowns,
        ...(dbValue.pushCooldowns || {})
      },
      maxRecentActors: dbValue.maxRecentActors ?? DEFAULT_CONFIG.maxRecentActors,
      displayThresholds: {
        ...DEFAULT_CONFIG.displayThresholds,
        ...(dbValue.displayThresholds || {})
      }
    };
  } catch (error) {
    console.error('[NotificationConfig] Failed to load from AppConfig, using defaults:', error.message);
    return { ...DEFAULT_CONFIG };
  }
}

export { DEFAULT_CONFIG };
