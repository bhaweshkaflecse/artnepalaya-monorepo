import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { PostDetailScreen } from '../screens/post/PostDetailScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { CmsPageScreen } from '../screens/settings/CmsPageScreen';

export type AppStackParamList = {
  MainTabs: undefined;
  PostDetail: { postId: string };
  Notifications: undefined;
  EditProfile: undefined;
  Settings: undefined;
  CmsPage: { slug: string; title: string };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CmsPage" component={CmsPageScreen} />
    </Stack.Navigator>
  );
};
