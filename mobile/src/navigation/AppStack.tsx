import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { MainTabs } from './MainTabs';
import { PostDetailScreen } from '../screens/post/PostDetailScreen';
import { EditPostScreen } from '../screens/post/EditPostScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { UserProfileScreen } from '../screens/profile/UserProfileScreen';
import { CmsPageScreen } from '../screens/settings/CmsPageScreen';
import { DevDiagnosticsScreen } from '../screens/settings/DevDiagnosticsScreen';
import { CreateScreen } from '../screens/create/CreateScreen';
import { setupNotificationListeners, registerForPushNotifications } from '../services/pushNotification.service';
import { connectSocket, disconnectSocket } from '../services/socket.service';
import { ENV } from '../config/env';
import { useAppSelector } from '../store';
import { selectAccessToken } from '../store/slices/authSlice';
import { Post } from '../services/post.service';

export type AppStackParamList = {
  MainTabs: undefined;
  PostDetail: { postId: string; initialMediaIndex?: number };
  EditPost: { postId: string; post: Post };
  Notifications: undefined;
  EditProfile: undefined;
  Settings: undefined;
  CmsPage: { slug: string; title: string };
  UserProfile: { userId: string };
  CreatePost: undefined;
  DevDiagnostics: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppStack = () => {
  const navigation = useNavigation();
  const accessToken = useAppSelector(selectAccessToken);
  const hasReregisteredPushToken = useRef(false);

  useEffect(() => {
    const cleanup = setupNotificationListeners((response) => {
      // Navigate to Notifications screen when user taps a notification
      navigation.navigate('Notifications' as never);
    });

    return cleanup;
  }, [navigation]);

  // Connect/disconnect socket based on auth state (not token refreshes)
  const isAuthenticated = !!accessToken;

  // Re-register push token when app returns to foreground (once per session)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        nextAppState === 'active' &&
        isAuthenticated &&
        !hasReregisteredPushToken.current
      ) {
        hasReregisteredPushToken.current = true;
        console.log('[AppStack] App resumed - re-registering push token');
        registerForPushNotifications(accessToken!);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      console.log('[AppStack] Socket init - isAuthenticated:', isAuthenticated, 'tokenLength:', accessToken?.length);
      // Derive socket server URL by stripping '/api/v1' from the API URL
      connectSocket(accessToken, ENV.SOCKET_URL);
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="EditPost" component={EditPostScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CmsPage" component={CmsPageScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="CreatePost" component={CreateScreen} />
      <Stack.Screen name="DevDiagnostics" component={DevDiagnosticsScreen} />
    </Stack.Navigator>
  );
};
