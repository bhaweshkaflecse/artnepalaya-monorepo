import { Expo } from 'expo-server-sdk';
import { User } from '../../modules/users/user.model.js';

const expo = new Expo();

/**
 * PushService - Dedicated push notification delivery service wrapping expo-server-sdk.
 *
 * Handles:
 * - Token validation via Expo.isExpoPushToken()
 * - Message construction with title/body/data/sound
 * - Chunked sending via expo.chunkPushNotifications() + expo.sendPushNotificationsAsync()
 * - Receipt checking via expo.getPushNotificationReceiptsAsync()
 * - Invalid token cleanup (DeviceNotRegistered -> remove from User.pushTokens)
 */

/**
 * Sends push notifications to the given tokens.
 * @param {Object} params
 * @param {string[]} params.tokens - Array of Expo push tokens
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body message
 * @param {Object} [params.data] - Optional data payload
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export const send = async ({ tokens, title, body, data }) => {
  console.log('[PushService] Attempting to send to', tokens ? tokens.length : 0, 'tokens');
  if (!tokens || tokens.length === 0) {
    console.log('[PushService] No tokens provided, skipping send');
    return { sent: 0, failed: 0 };
  }

  // Validate tokens
  const validTokens = tokens.filter((token) => {
    const isValid = Expo.isExpoPushToken(token);
    if (!isValid) {
      console.log(`[PushService] Invalid token filtered out: ${token}`);
    }
    return isValid;
  });

  if (validTokens.length === 0) {
    console.log('[PushService] No valid Expo push tokens after filtering');
    return { sent: 0, failed: tokens.length };
  }

  console.log('[PushService] Valid tokens after filtering:', validTokens.length, 'of', tokens.length);

  // Build messages
  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    ...(data ? { data } : {}),
  }));

  console.log(`[PushService] Sending ${messages.length} push notification(s): "${title}"`);

  // Chunk and send
  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  let failed = 0;
  const ticketIds = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < ticketChunk.length; i++) {
        const ticket = ticketChunk[i];
        if (ticket.status === 'ok') {
          sent++;
          if (ticket.id) {
            ticketIds.push({ ticketId: ticket.id, token: chunk[i].to });
          }
        } else {
          failed++;
          console.log(`[PushService] Send failed for token: ${chunk[i].to}, error: ${ticket.message || 'unknown'}`);
        }
      }
    } catch (error) {
      console.error('[PushService] Error sending chunk:', error.message || error);
      failed += chunk.length;
    }
  }

  console.log(`[PushService] Send complete: ${sent} sent, ${failed} failed`);

  // Check receipts after a short delay (inline, no worker)
  if (ticketIds.length > 0) {
    checkReceipts(ticketIds);
  }

  return { sent, failed };
};

/**
 * Checks push notification receipts after a delay and cleans up invalid tokens.
 * Called inline but uses setTimeout to allow the Expo service time to process.
 * @param {{ ticketId: string, token: string }[]} ticketIds
 */
const checkReceipts = (ticketIds) => {
  // Wait 15 seconds before checking receipts to give Expo time to process
  setTimeout(async () => {
    try {
      const receiptIdChunks = expo.chunkPushNotificationReceiptIds(
        ticketIds.map((t) => t.ticketId)
      );

      for (const chunk of receiptIdChunks) {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

        console.log(`[PushService] Receipt check: ${Object.keys(receipts).length} receipt(s) retrieved`);

        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status === 'ok') {
            continue;
          }

          if (receipt.status === 'error') {
            console.log(`[PushService] Receipt error: ${receipt.message}, details: ${JSON.stringify(receipt.details)}`);

            // Clean up invalid tokens (DeviceNotRegistered)
            if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
              const ticketEntry = ticketIds.find((t) => t.ticketId === receiptId);
              if (ticketEntry) {
                console.log(`[PushService] Token cleanup: removing invalid token ${ticketEntry.token}`);
                try {
                  await User.findOneAndUpdate(
                    { pushTokens: ticketEntry.token },
                    { $pull: { pushTokens: ticketEntry.token } }
                  );
                  console.log(`[PushService] Token cleanup successful: ${ticketEntry.token}`);
                } catch (cleanupErr) {
                  console.error(`[PushService] Token cleanup failed: ${cleanupErr.message}`);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[PushService] Receipt check failed:', err.message || err);
    }
  }, 15000);
};

export default { send };
