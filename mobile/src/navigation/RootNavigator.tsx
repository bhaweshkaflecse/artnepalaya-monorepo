// src/navigation/RootNavigator.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAppSelector } from '../store';
import { selectIsAuthenticated, selectIsGuest } from '../store/slices/authSlice';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { GlobalPopupModal } from '../components/common/GlobalPopupModal';

export const RootNavigator = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isGuest = useAppSelector(selectIsGuest);
  const { hasCompletedOnboarding, isAppReady } = useAppSelector((state) => state.app);

  if (!isAppReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen />;
  }

  if (isAuthenticated || isGuest) {
    return (
      <>
        <AppStack />
        <GlobalPopupModal />
      </>
    );
  }

  return <AuthStack />;
};
