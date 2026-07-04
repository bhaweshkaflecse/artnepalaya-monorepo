import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
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
    console.log('[PushReg] Stage 1: Starting registration, isDevice=' + Device.isDevice);
    if (!Device.isDevice) {
      console.log('[PushNotifications] Must use physical device for push notifications');
      return null;
    }

    // Set up Android notification channel
    await setupAndroidChannel();
    console.log('[PushReg] Stage 2: Android channel setup complete');

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[PushReg] Stage 3: Permission status existing=' + existingStatus);
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    console.log('[PushReg] Stage 4: Permission after request=' + finalStatus);

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted');
      return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? 'bb44fc58-146f-4483-b61f-c9b7edbad4e6';
    console.log('[PushReg] Stage 5: Getting token with projectId=' + projectId);
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;

    console.log('[PushReg] Stage 6: Token received=' + token);

    // Register the token with the backend
    console.log('[PushReg] Stage 7: Calling POST /users/me/push-token');
    await notificationService.registerPushToken(token);
    console.log('[PushReg] Stage 8: Token registered successfully');

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
