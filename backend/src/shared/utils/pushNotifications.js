import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Sends push notifications to valid Expo push tokens.
 * @param {string[]} pushTokens - Array of Expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body message
 * @returns {{ sent: number, failed: number }}
 */
export const sendPushNotifications = async (pushTokens, title, body) => {
  if (!pushTokens || pushTokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Filter to only valid Expo push tokens
  const validTokens = pushTokens.filter((token) => Expo.isExpoPushToken(token));

  if (validTokens.length === 0) {
    return { sent: 0, failed: pushTokens.length };
  }

  // Build messages
  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
  }));

  // Chunk into batches
  const chunks = expo.chunkPushNotifications(messages);

  let sent = 0;
  let failed = 0;

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of ticketChunk) {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
        }
      }
    } catch (error) {
      console.error('Error sending push notification chunk:', error);
      failed += chunk.length;
    }
  }

  return { sent, failed };
};
