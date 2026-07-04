// src/navigation/RootNavigator.tsx
import React, { useRef, useEffect, useState } from 'react';
import { View, ActivityIndicator, Animated, Easing } from 'react-native';
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

  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // When isAppReady transitions to true, fade out the splash overlay
  useEffect(() => {
    if (isAppReady && showSplash) {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShowSplash(false);
        }
      });
    }
  }, [isAppReady, showSplash, splashOpacity]);

  // Determine the content to show beneath the splash overlay
  const renderContent = () => {
    if (!isAppReady) {
      // App not ready yet - show nothing beneath the splash
      return null;
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

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {renderContent()}
      {showSplash && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#000',
            opacity: splashOpacity,
          }}
          pointerEvents={isAppReady ? 'none' : 'auto'}
        >
          <ActivityIndicator size="large" color="#FF3B30" />
        </Animated.View>
      )}
    </View>
  );
};
