// src/navigation/RootNavigator.tsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAppSelector } from '../store';
import { selectIsAuthenticated, selectIsGuest } from '../store/slices/authSlice';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { UserPreferenceSetup } from '../screens/onboarding/UserPreferenceSetup';
import { GlobalPopupModal } from '../components/common/GlobalPopupModal';

export const RootNavigator = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isGuest = useAppSelector(selectIsGuest);
  const { hasCompletedOnboarding, needsUserOnboarding, isAppReady } = useAppSelector((state) => state.app);

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

  // Show user preference setup for new authenticated users
  if (isAuthenticated && needsUserOnboarding) {
    return <UserPreferenceSetup />;
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
