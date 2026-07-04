import { AppConfig } from '../admin/appConfig.model.js';

/**
 * Default notification configuration values.
 * These are used as fallback if no AppConfig entry exists in the database.
 */
const DEFAULT_CONFIG = {
  groupingWindows: {
    Like: 86400000,       // 24 hours in ms
    Save: 86400000,       // 24 hours in ms
    Follow: 86400000,     // 24 hours in ms
    Comment: 86400000     // 24 hours in ms
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
 * In-memory TTL cache for notification config.
 * Avoids hitting MongoDB on every createNotification call.
 */
let cachedConfig = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60000; // 60 seconds

/**
 * Load notification configuration from AppConfig (key: 'notification_config'),
 * merging with hardcoded defaults so the system works even without a DB entry.
 * Uses an in-memory cache with 60-second TTL to avoid per-call DB queries.
 *
 * @returns {Promise<object>} Merged notification config
 */
export async function getNotificationConfig() {
  // Return cached config if still valid
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }

  try {
    const configDoc = await AppConfig.findOne({ key: 'notification_config' }).lean();

    let merged;
    if (!configDoc || !configDoc.value) {
      merged = { ...DEFAULT_CONFIG };
    } else {
      const dbValue = configDoc.value;
      merged = {
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
    }

    // Update cache
    cachedConfig = merged;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cachedConfig;
  } catch (error) {
    console.error('[NotificationConfig] Failed to load from AppConfig, using defaults:', error.message);
    const fallback = { ...DEFAULT_CONFIG };
    cachedConfig = fallback;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return fallback;
  }
}

export { DEFAULT_CONFIG };
