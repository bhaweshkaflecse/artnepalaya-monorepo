// src/navigation/AuthStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { CmsPageScreen } from '../screens/settings/CmsPageScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Otp: undefined;
  CmsPage: { slug: string; title: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="CmsPage" component={CmsPageScreen} />
    </Stack.Navigator>
  );
};
