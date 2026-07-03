// src/screens/onboarding/OnboardingScreen.tsx
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ViewToken,
  SafeAreaView,
  Image,
  Animated,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAppDispatch } from '../../store';
import { setOnboardingComplete } from '../../store/slices/appSlice';
import { setCredentials, setGuest } from '../../store/slices/authSlice';
import { api } from '../../services/api';
import { authService } from '../../services/auth.service';
import { registerForPushNotifications } from '../../services/pushNotification.service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Google OAuth configuration
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

interface SlideData {
  id: string;
  key: 'welcome' | 'origin' | 'getStarted';
}

const slides: SlideData[] = [
  { id: '1', key: 'welcome' },
  { id: '2', key: 'origin' },
  { id: '3', key: 'getStarted' },
];

/**
 * Generates a unique device identifier for token binding.
 */
function getDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${Platform.OS}-${timestamp}-${random}`;
}

// Role data for Screen 3
const roles = [
  {
    icon: 'brush' as const,
    iconFamily: 'MaterialCommunityIcons' as const,
    title: 'Artist',
    subtitle: 'Showcase and sell your artwork',
  },
  {
    icon: 'heart' as const,
    iconFamily: 'Feather' as const,
    title: 'Art Lover',
    subtitle: 'Discover and collect amazing pieces',
  },
  {
    icon: 'image' as const,
    iconFamily: 'Feather' as const,
    title: 'Gallery',
    subtitle: 'Manage your gallery online',
  },
  {
    icon: 'briefcase' as const,
    iconFamily: 'Feather' as const,
    title: 'Business',
    subtitle: 'Connect with creative talent',
  },
];

export const OnboardingScreen = () => {
  const dispatch = useAppDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Fade animations for each screen
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const slideAnim1 = useRef(new Animated.Value(30)).current;
  const slideAnim2 = useRef(new Animated.Value(30)).current;
  const slideAnim3 = useRef(new Animated.Value(30)).current;

  const fadeAnims = [fadeAnim1, fadeAnim2, fadeAnim3];
  const slideAnims = [slideAnim1, slideAnim2, slideAnim3];

  // Configure Google Sign-In on mount
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  // Animate first screen on mount
  useEffect(() => {
    animateScreen(0);
  }, []);

  // Animate screen content when currentIndex changes
  useEffect(() => {
    animateScreen(currentIndex);
  }, [currentIndex]);

  const animateScreen = (index: number) => {
    // Reset animation values
    fadeAnims[index].setValue(0);
    slideAnims[index].setValue(30);

    Animated.parallel([
      Animated.timing(fadeAnims[index], {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnims[index], {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // ---- Action Handlers ----

  const handleGetStarted = async () => {
    dispatch(setOnboardingComplete());
    await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');
  };

  const handleGuestLogin = async () => {
    const chars = '0123456789ABCDEF';
    let random5 = '';
    for (let i = 0; i < 5; i++) {
      random5 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const guestUsername = `Guest_${random5}`;

    dispatch(setGuest({ guestUsername }));

    // Complete onboarding for guests too
    dispatch(setOnboardingComplete());
    await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');

    // Background: persist to SecureStore (non-blocking)
    (async () => {
      try {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        const existingUsername = await SecureStore.getItemAsync('guestUsername');
        if (!existingUsername) {
          await SecureStore.setItemAsync('guestUsername', guestUsername);
        }
        await SecureStore.setItemAsync('guestDisplayName', 'Guest Explorer');
      } catch (e) {
        console.warn('[Onboarding] Guest SecureStore cleanup failed:', e);
      }
    })();
  };

  const handleAuthSuccess = async (idToken: string) => {
    try {
      let deviceId = await SecureStore.getItemAsync('deviceId');
      if (!deviceId) {
        deviceId = getDeviceId();
        await SecureStore.setItemAsync('deviceId', deviceId);
      }

      const authResponse = await authService.googleLogin(idToken, deviceId);
      const { user, accessToken, refreshToken } = authResponse.data;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      dispatch(setCredentials({ user, accessToken, refreshToken }));

      // Complete onboarding after successful auth
      dispatch(setOnboardingComplete());
      await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');

      registerForPushNotifications().catch((err) =>
        console.warn('[Onboarding] Push notification registration failed:', err)
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.message ||
        'An unexpected error occurred during sign-in.';
      Alert.alert('Sign-In Failed', message, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken;
      if (idToken) {
        await handleAuthSuccess(idToken);
      } else {
        Alert.alert(
          'Sign-In Issue',
          'Authentication succeeded but token was not received. Please try again.'
        );
        setIsLoading(false);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Sign in already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services are not available on this device.');
      } else {
        Alert.alert(
          'Sign-In Failed',
          'Google authentication encountered an error. Please try again.'
        );
        console.error('[GoogleAuth] Error:', error);
      }
      setIsLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    try {
      const res = await api.post('/auth/admin-login', {
        email: 'admin@artnepalaya.com',
        password: 'SuperAdmin##5656#$$@',
      });
      const { user, accessToken, refreshToken } = res.data.data;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      dispatch(setCredentials({ user, accessToken, refreshToken }));

      // Complete onboarding after successful dev login
      dispatch(setOnboardingComplete());
      await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');

      registerForPushNotifications().catch((err) =>
        console.warn('[Onboarding] Push notification registration failed:', err)
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.message ||
        'Backend unreachable. Is the server running?';
      Alert.alert('Developer Login Failed', message, [{ text: 'OK' }]);
      console.error('[DevLogin] Error:', error);
    } finally {
      setDevLoading(false);
    }
  };

  // ---- Render Role Item ----
  const renderRoleItem = (role: typeof roles[number], index: number) => {
    const renderIcon = () => {
      if (role.iconFamily === 'MaterialCommunityIcons') {
        return <MaterialCommunityIcons name={role.icon as any} size={22} color="#FF3B30" />;
      }
      return <Feather name={role.icon as any} size={22} color="#FF3B30" />;
    };

    return (
      <View key={index} style={styles.roleItem}>
        <View style={styles.roleIconContainer}>
          {renderIcon()}
        </View>
        <View style={styles.roleTextContainer}>
          <Text style={styles.roleTitle}>{role.title}</Text>
          <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
        </View>
      </View>
    );
  };

  // ---- Render Slides ----
  const renderSlide = ({ item, index }: { item: SlideData; index: number }) => {
    const fadeAnim = fadeAnims[index];
    const slideAnim = slideAnims[index];

    if (item.key === 'welcome') {
      return (
        <View style={[styles.slide, styles.darkBackground]}>
          {/* Decorative background element */}
          <View style={styles.decorativeCircle} />
          <View style={styles.decorativeCircle2} />

          <Animated.View
            style={[
              styles.slideContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.heroTitle}>
              Made for Art Lovers{'\n'}& Creators
            </Text>

            {/* Description */}
            <Text style={styles.heroDescription}>
              Nepal's premier platform for discovering, sharing, and celebrating art from across the Himalayan region.
            </Text>

            {/* Decorative divider */}
            <View style={styles.dividerLine} />
          </Animated.View>
        </View>
      );
    }

    if (item.key === 'origin') {
      return (
        <View style={[styles.slide, styles.darkBackground]}>
          {/* Decorative background */}
          <View style={styles.decorativeCircleOrigin} />

          <Animated.View
            style={[
              styles.slideContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Title */}
            <Text style={styles.originTitle}>
              Made in Nepal.{'\n'}Built for the World.
            </Text>

            {/* Large artwork placeholder */}
            <View style={styles.artworkPlaceholder}>
              <View style={styles.artworkInner}>
                <MaterialCommunityIcons name="palette" size={64} color="rgba(255,255,255,0.3)" />
                <Text style={styles.artworkPlaceholderText}>
                  Connecting Nepali artists{'\n'}with the global community
                </Text>
              </View>
            </View>

            {/* Subtitle */}
            <Text style={styles.originSubtitle}>
              Bridging traditional craftsmanship with modern platforms to bring Nepali artistry to collectors worldwide.
            </Text>
          </Animated.View>
        </View>
      );
    }

    // Screen 3: Get Started
    return (
      <View style={[styles.slide, styles.darkBackground]}>
        <SafeAreaView style={styles.screen3SafeArea}>
          <Animated.View
            style={[
              styles.screen3Content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Title */}
            <Text style={styles.screen3Title}>
              Grow Your{'\n'}Creative Business
            </Text>

            {/* Roles list */}
            <View style={styles.rolesContainer}>
              {roles.map((role, idx) => renderRoleItem(role, idx))}
            </View>

            {/* Get Started CTA */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleGetStarted}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaButtonText}>Get Started</Text>
            </TouchableOpacity>

            {/* Continue as Guest */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestLogin}
              activeOpacity={0.7}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>

            {/* Sign in with Google */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <AntDesign name="google" size={18} color="#FFFFFF" style={styles.googleIcon} />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Developer Login */}
            <TouchableOpacity
              style={styles.devButton}
              onPress={handleDevLogin}
              activeOpacity={0.6}
              disabled={devLoading}
            >
              {devLoading ? (
                <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
              ) : (
                <Text style={styles.devButtonText}>Developer Login (QA)</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Dot indicators */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkBackground: {
    backgroundColor: '#0A0A0A',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },

  // ---- Decorative backgrounds ----
  decorativeCircle: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.1,
    right: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: 'rgba(255,59,48,0.04)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.15,
    left: -SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    backgroundColor: 'rgba(45,27,78,0.08)',
  },
  decorativeCircleOrigin: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.2,
    left: -SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: 'rgba(45,27,78,0.06)',
  },

  // ---- Logo ----
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },

  // ---- Screen 1: Welcome ----
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 42,
    marginBottom: 20,
  },
  heroDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  dividerLine: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FF3B30',
    opacity: 0.8,
  },

  // ---- Screen 2: Origin Story ----
  originTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 32,
  },
  artworkPlaceholder: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.85,
    borderRadius: 20,
    backgroundColor: '#2D1B4E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
  },
  artworkInner: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  artworkPlaceholderText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  originSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },

  // ---- Screen 3: Get Started ----
  screen3SafeArea: {
    flex: 1,
    width: '100%',
  },
  screen3Content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: SCREEN_HEIGHT * 0.08,
    paddingBottom: 24,
    justifyContent: 'flex-start',
  },
  screen3Title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 24,
  },

  // ---- Roles ----
  rolesContainer: {
    marginBottom: 28,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  roleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,59,48,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  roleSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
  },

  // ---- CTA Button ----
  ctaButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ---- Guest Button ----
  guestButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  guestButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '600',
  },

  // ---- Google Button ----
  googleButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // ---- Dev Button ----
  devButton: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  devButtonText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '500',
  },

  // ---- Dots ----
  dotsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: '#FF3B30',
    width: 24,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});
