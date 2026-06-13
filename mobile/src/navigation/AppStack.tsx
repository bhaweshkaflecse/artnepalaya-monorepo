import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { MainTabs } from './MainTabs';
import { PostDetailScreen } from '../screens/post/PostDetailScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { UserProfileScreen } from '../screens/profile/UserProfileScreen';
import { CmsPageScreen } from '../screens/settings/CmsPageScreen';
import { setupNotificationListeners } from '../services/pushNotification.service';

export type AppStackParamList = {
  MainTabs: undefined;
  PostDetail: { postId: string };
  Notifications: undefined;
  EditProfile: undefined;
  Settings: undefined;
  CmsPage: { slug: string; title: string };
  UserProfile: { userId: string };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppStack = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const cleanup = setupNotificationListeners((response) => {
      // Navigate to Notifications screen when user taps a notification
      navigation.navigate('Notifications' as never);
    });

    return cleanup;
  }, [navigation]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CmsPage" component={CmsPageScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
};
