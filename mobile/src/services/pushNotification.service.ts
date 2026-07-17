import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationService } from './notification.service';

const TAG = '[PushReg]';

// Set notification handler IMMEDIATELY on module load (not inside a component).
// This ensures foreground notifications are displayed even if the notification
// arrives before the AppStack component mounts and calls setupNotificationListeners().
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF3B30',
  });
}

/**
 * Sets up the Android notification channel.
 * Must be called before notifications are displayed on Android.
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    console.log(TAG, 'Setting up Android notification channel...');
    const channel = await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B30',
    });
    console.log(TAG, 'Android channel created:', JSON.stringify(channel));
  } else {
    console.log(TAG, 'Skipping Android channel setup (platform=' + Platform.OS + ')');
  }
}

/**
 * Registers for push notifications by requesting permission,
 * getting the Expo push token, and sending it to the backend.
 * Returns the token string or null if registration fails.
 *
 * Verbose logging at every stage so the user can see in Android Logcat
 * exactly where the token registration pipeline breaks.
 */
export async function registerForPushNotifications(accessToken?: string): Promise<string | null> {
  const startTime = Date.now();
  console.log(TAG, '=== PUSH TOKEN REGISTRATION START ===');
  console.log(TAG, 'Timestamp:', new Date().toISOString());
  console.log(TAG, 'Platform:', Platform.OS, 'Version:', Platform.Version);
  console.log(TAG, 'Device.isDevice:', Device.isDevice);
  console.log(TAG, 'Device.brand:', Device.brand);
  console.log(TAG, 'Device.modelName:', Device.modelName);
  console.log(TAG, 'Device.osName:', Device.osName, 'osVersion:', Device.osVersion);

  try {
    // Stage 1: Device check
    console.log(TAG, 'Stage 1/8: Checking if physical device...');
    if (!Device.isDevice) {
      console.warn(TAG, 'ABORT: Not a physical device. Push notifications require a real device.');
      return null;
    }
    console.log(TAG, 'Stage 1/8: PASS - Running on physical device');

    // Stage 2: Android channel setup
    console.log(TAG, 'Stage 2/8: Setting up Android notification channel...');
    await setupAndroidChannel();
    console.log(TAG, 'Stage 2/8: PASS - Channel setup complete (' + (Date.now() - startTime) + 'ms elapsed)');

    // Stage 3: Check existing permissions
    console.log(TAG, 'Stage 3/8: Checking existing notification permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log(TAG, 'Stage 3/8: Current permission status =', existingStatus);

    let finalStatus = existingStatus;

    // Stage 4: Request permissions if needed
    if (existingStatus !== 'granted') {
      console.log(TAG, 'Stage 4/8: Permission not yet granted, requesting...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log(TAG, 'Stage 4/8: Permission response =', finalStatus);
    } else {
      console.log(TAG, 'Stage 4/8: Permission already granted, skipping request');
    }

    if (finalStatus !== 'granted') {
      console.warn(TAG, 'ABORT: Permission denied. finalStatus =', finalStatus);
      return null;
    }
    console.log(TAG, 'Stage 4/8: PASS - Notification permission granted (' + (Date.now() - startTime) + 'ms elapsed)');

    // Stage 5: Resolve project ID
    console.log(TAG, 'Stage 5/8: Resolving Expo project ID...');
    const expoConfigProjectId = Constants.expoConfig?.extra?.eas?.projectId;
    const fallbackProjectId = 'bb44fc58-146f-4483-b61f-c9b7edbad4e6';
    const projectId = expoConfigProjectId ?? fallbackProjectId;
    console.log(TAG, 'Stage 5/8: expoConfig.extra.eas.projectId =', expoConfigProjectId || '(undefined, using fallback)');
    console.log(TAG, 'Stage 5/8: Using projectId =', projectId);
    console.log(TAG, 'Stage 5/8: Constants.expoConfig?.name =', Constants.expoConfig?.name);
    console.log(TAG, 'Stage 5/8: Constants.expoConfig?.slug =', Constants.expoConfig?.slug);

    // Stage 6: Get Expo push token
    console.log(TAG, 'Stage 6/8: Calling Notifications.getExpoPushTokenAsync({ projectId })...');
    const tokenRequestStart = Date.now();
    let tokenData;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    } catch (tokenError: any) {
      console.error(TAG, 'Stage 6/8: FAILED - getExpoPushTokenAsync threw an error');
      console.error(TAG, 'Error message:', tokenError?.message);
      console.error(TAG, 'Error name:', tokenError?.name);
      console.error(TAG, 'Error stack:', tokenError?.stack?.substring(0, 500));
      console.error(TAG, 'This usually means: invalid projectId, no Google Services config, or network issue');
      throw tokenError;
    }
    const token = tokenData.data;
    console.log(TAG, 'Stage 6/8: PASS - Token received in', (Date.now() - tokenRequestStart) + 'ms');
    console.log(TAG, 'Stage 6/8: Token type:', tokenData.type);
    console.log(TAG, 'Stage 6/8: Token value:', token);
    console.log(TAG, 'Stage 6/8: Token format valid:', token?.startsWith('ExponentPushToken[') ? 'YES' : 'NO (unexpected format!)');

    // Stage 7: Send token to backend
    console.log(TAG, 'Stage 7/8: Sending token to backend via POST /users/me/push-token...');
    console.log(TAG, 'Stage 7/8: Using explicit accessToken?', accessToken ? 'YES' : 'NO (relying on interceptor)');
    const backendRequestStart = Date.now();
    try {
      await notificationService.registerPushToken(token, accessToken);
    } catch (backendError: any) {
      console.error(TAG, 'Stage 7/8: FAILED - Backend rejected the token registration');
      console.error(TAG, 'HTTP status:', backendError?.response?.status);
      console.error(TAG, 'Error message:', backendError?.message);
      console.error(TAG, 'Response data:', JSON.stringify(backendError?.response?.data));
      console.error(TAG, 'Is auth token present?', backendError?.config?.headers?.Authorization ? 'YES' : 'NO (likely not authenticated!)');
      console.error(TAG, 'Request URL:', backendError?.config?.url || backendError?.config?.baseURL);
      throw backendError;
    }
    console.log(TAG, 'Stage 7/8: PASS - Backend accepted token in', (Date.now() - backendRequestStart) + 'ms');

    // Stage 8: Complete
    console.log(TAG, '=== PUSH TOKEN REGISTRATION SUCCESS ===');
    console.log(TAG, 'Stage 8/8: Registration complete!');
    console.log(TAG, 'Total time:', (Date.now() - startTime) + 'ms');
    console.log(TAG, 'Token:', token);

    return token;
  } catch (error: any) {
    console.error(TAG, '=== PUSH TOKEN REGISTRATION FAILED ===');
    console.error(TAG, 'Error message:', error?.message);
    console.error(TAG, 'Total time before failure:', (Date.now() - startTime) + 'ms');
    console.error(TAG, 'Error type:', error?.constructor?.name || typeof error);
    console.error(TAG, 'Error code:', error?.code);
    console.error(TAG, 'HTTP status:', error?.response?.status);
    console.error(TAG, 'Response body:', JSON.stringify(error?.response?.data));
    console.error(TAG, 'Stack trace:', error?.stack?.substring(0, 800));
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
