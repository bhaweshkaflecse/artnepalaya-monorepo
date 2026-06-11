import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationService } from './notification.service';

/**
 * Sets up the Android notification channel.
 * Must be called before notifications are displayed on Android.
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B30',
    });
  }
}

/**
 * Registers for push notifications by requesting permission,
 * getting the Expo push token, and sending it to the backend.
 * Returns the token string or null if registration fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('[PushNotifications] Must use physical device for push notifications');
      return null;
    }

    // Set up Android notification channel
    await setupAndroidChannel();

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    console.log('[PushNotifications] Token:', token);

    // Register the token with the backend
    await notificationService.registerPushToken(token);

    return token;
  } catch (error) {
    console.error('[PushNotifications] Registration failed:', error);
    return null;
  }
}

/**
 * Sets up notification listeners for foreground display and tap handling.
 * Returns a cleanup function to remove the listeners.
 */
export function setupNotificationListeners(
  onNotificationTap?: (notification: Notifications.NotificationResponse) => void
): () => void {
  // Configure how notifications are handled when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Listener for when a notification is received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[PushNotifications] Foreground notification:', notification.request.content.title);
  });

  // Listener for when user taps on a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[PushNotifications] Notification tapped:', response.notification.request.content.title);
    if (onNotificationTap) {
      onNotificationTap(response);
    }
  });

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
