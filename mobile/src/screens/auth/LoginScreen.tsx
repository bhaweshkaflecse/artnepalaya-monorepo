// src/screens/auth/LoginScreen.tsx
// NOTE: @react-native-google-signin/google-signin requires a native rebuild
// (npx expo prebuild then EAS build) after initial installation.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  PanResponder,
} from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAppDispatch, useAppSelector } from '../../store';
import { setCredentials, setGuest } from '../../store/slices/authSlice';
import { fetchAuthConfig, resetOnboarding } from '../../store/slices/appSlice';
import { api } from '../../services/api';
import { authService } from '../../services/auth.service';
import { lightColors } from '../../theme/colors';
import { registerForPushNotifications } from '../../services/pushNotification.service';

// Google OAuth configuration
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Cover Flow geometry - uses plain View + absolute positioning (NOT ScrollView)
// This guarantees neighbor items are always visible without clipping
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH * 0.62;
const CAROUSEL_ITEM_HEIGHT = CAROUSEL_ITEM_WIDTH * (4 / 3);
const CAROUSEL_HEIGHT = SCREEN_HEIGHT * 0.40;
// Side items peek ~30% from behind center card
const SIDE_TRANSLATE_X = CAROUSEL_ITEM_WIDTH * 0.38;

/**
 * Generates a unique device identifier for token binding.
 */
function getDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${Platform.OS}-${timestamp}-${random}`;
}

export const LoginScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  // Carousel state - PanResponder approach (no ScrollView clipping)
  const authBackgroundMedia = useAppSelector((state) => state.app.authBackgroundMedia);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Fetch fresh auth background media on mount
  useEffect(() => {
    dispatch(fetchAuthConfig());
  }, [dispatch]);

  // Configure Google Sign-In on mount
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  // Mount fade-in animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Placeholder carousel items
  const placeholderMedia = [
    { url: '', type: 'placeholder' as const, color: '#F8F0E8' },
    { url: '', type: 'placeholder' as const, color: '#F0E8E0' },
    { url: '', type: 'placeholder' as const, color: '#E8E0D8' },
    { url: '', type: 'placeholder' as const, color: '#F5EDE5' },
    { url: '', type: 'placeholder' as const, color: '#EDE5DD' },
  ];

  const carouselData = authBackgroundMedia.length > 0 ? authBackgroundMedia : placeholderMedia;
  const itemCount = carouselData.length;
  const itemCountRef = useRef(itemCount);
  itemCountRef.current = itemCount;

  // Keep activeIndexRef in sync
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // PanResponder using refs to avoid stale closures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 15,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) {
          // Swipe left = go next
          const count = itemCountRef.current;
          const next = ((activeIndexRef.current + 1) % count + count) % count;
          activeIndexRef.current = next;
          setActiveIndex(next);
        } else if (gs.dx > 50) {
          // Swipe right = go prev
          const count = itemCountRef.current;
          const prev = ((activeIndexRef.current - 1) % count + count) % count;
          activeIndexRef.current = prev;
          setActiveIndex(prev);
        }
      },
    })
  ).current;

  // Auto-scroll carousel (gated by screen focus)
  useFocusEffect(
    useCallback(() => {
      if (itemCount <= 1) return;

      autoScrollTimer.current = setInterval(() => {
        const count = itemCountRef.current;
        const next = ((activeIndexRef.current + 1) % count + count) % count;
        activeIndexRef.current = next;
        setActiveIndex(next);
      }, 4000);

      return () => {
        if (autoScrollTimer.current) {
          clearInterval(autoScrollTimer.current);
          autoScrollTimer.current = null;
        }
      };
    }, [itemCount])
  );

  const handleAuthSuccess = async (idToken: string) => {
    try {
      let deviceId = await SecureStore.getItemAsync('deviceId');
      if (!deviceId) {
        deviceId = getDeviceId();
        await SecureStore.setItemAsync('deviceId', deviceId);
      }

      const authResponse = await authService.googleLogin(idToken, deviceId);
      const { user, accessToken, refreshToken, isNewUser } = authResponse.data;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      dispatch(setCredentials({ user, accessToken, refreshToken }));

      // If this is a new user, reset onboarding so they see the onboarding flow
      if (isNewUser) {
        await SecureStore.deleteItemAsync('hasCompletedOnboarding');
        dispatch(resetOnboarding());
      }

      // Register push notifications after credentials are fully stored
      registerForPushNotifications().catch((err) =>
        console.warn('[LoginScreen] Push notification registration failed:', err)
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
        Alert.alert('Sign-In Issue', 'Authentication succeeded but token was not received. Please try again.');
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
        Alert.alert('Sign-In Failed', 'Google authentication encountered an error. Please try again.');
        console.error('[GoogleAuth] Error:', error);
      }
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    // Generate guest username synchronously
    const chars = '0123456789ABCDEF';
    let random5 = '';
    for (let i = 0; i < 5; i++) {
      random5 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const guestUsername = `Guest_${random5}`;

    // Dispatch immediately - navigation happens via Redux state change
    dispatch(setGuest({ guestUsername }));

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
        console.warn('[LoginScreen] Guest SecureStore cleanup failed:', e);
      }
    })();
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    setDevError(null);
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

      registerForPushNotifications().catch((err) =>
        console.warn('[LoginScreen] Push notification registration failed:', err)
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.message ||
        'Backend unreachable. Is the server running?';
      setDevError(message);
      console.error('[DevLogin] Full error:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
        code: error?.code,
        configUrl: error?.config?.url,
        configBaseURL: error?.config?.baseURL,
      });
    } finally {
      setDevLoading(false);
    }
  };

  // Button press animation helpers
  const onPressIn = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressOut = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, []);

  // Render Cover Flow items - absolutely positioned inside a plain View
  // This is the key fix: NO ScrollView means NO clipping of neighbors
  const renderCoverFlowItems = () => {
    const items: React.ReactNode[] = [];

    for (let offset = -2; offset <= 2; offset++) {
      const dataIndex = ((activeIndex + offset) % itemCount + itemCount) % itemCount;
      const item = carouselData[dataIndex];

      // Position-based transforms for Cover Flow effect
      let translateX = 0;
      let scale = 1.0;
      let rotateY = '0deg';
      let zIdx = 10;
      let itemOpacity = 1.0;

      if (offset === 0) {
        translateX = 0;
        scale = 1.0;
        rotateY = '0deg';
        zIdx = 10;
        itemOpacity = 1.0;
      } else if (Math.abs(offset) === 1) {
        // Immediate neighbors - visible ~30% peeking from behind center
        translateX = offset * SIDE_TRANSLATE_X;
        scale = 0.72;
        rotateY = offset < 0 ? '28deg' : '-28deg';
        zIdx = 5;
        itemOpacity = 0.85;
      } else {
        // Far items - barely visible at edges
        translateX = offset * SIDE_TRANSLATE_X * 1.6;
        scale = 0.55;
        rotateY = offset < 0 ? '45deg' : '-45deg';
        zIdx = 1;
        itemOpacity = 0.4;
      }

      items.push(
        <View
          key={`coverflow-${offset}`}
          style={[
            styles.coverFlowItem,
            {
              transform: [
                { perspective: 1200 },
                { translateX: translateX },
                { scale: scale },
                { rotateY: rotateY },
              ],
              zIndex: zIdx,
              opacity: itemOpacity,
            },
          ]}
        >
          <View style={styles.coverFlowItemInner}>
            {item.url ? (
              <>
                <Image
                  source={{ uri: item.url }}
                  style={styles.coverFlowImage}
                  resizeMode="cover"
                />
                {(item as any).artist ? (
                  <View style={styles.artistOverlay}>
                    <Feather name="user" size={10} color="#FFFFFF" />
                    <Text style={styles.artistOverlayText}>@{(item as any).artist}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={[styles.coverFlowPlaceholder, { backgroundColor: item.color || '#F0E8E0' }]}>
                <Feather name="image" size={36} color={lightColors.textSecondary} />
              </View>
            )}
          </View>
        </View>
      );
    }

    return items;
  };

  return (
    <View style={styles.root}>
      {/* Background image - the ONLY background behind hero */}
      <Image
        source={require('../../../assets/loginimage.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Very subtle overlay for text readability */}
      <View style={styles.backgroundOverlay} />
      {/* Subtle warm-to-cream gradient simulation */}
      <View style={styles.gradientBottom} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.outerScrollView}
          contentContainerStyle={styles.outerScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* === TOP ~42% - Hero Cover Flow === */}
          {/* Uses plain View container with absolute items - NO ScrollView clipping */}
          <View style={styles.heroSection} {...panResponder.panHandlers}>
            {renderCoverFlowItems()}
          </View>

          {/* === MIDDLE - Brand Section === */}
          <Animated.View
            style={[
              styles.brandSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.brandName}>ArtNepalaya</Text>
            <Text style={styles.tagline}>Discover {'\u00B7'} Share {'\u00B7'} Inspire</Text>
            <Text style={styles.brandDescription}>
              Nepal's premier platform for artists and art lovers.{'\n'}Showcase your creativity to the world.
            </Text>

            {/* Statistics Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>18K+</Text>
                <Text style={styles.statLabel}>Artists</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>75K+</Text>
                <Text style={styles.statLabel}>Artworks</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{'\u{1F1F3}\u{1F1F5}'}</Text>
                <Text style={styles.statLabel}>Made in Nepal</Text>
              </View>
            </View>
          </Animated.View>

          {/* === BOTTOM - Authentication Section === */}
          <Animated.View
            style={[
              styles.authSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: buttonScale }],
              },
            ]}
          >
            {/* Primary: Continue with Google */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <AntDesign name="google" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.orDivider}>
              <View style={styles.orDividerLine} />
              <Text style={styles.orDividerText}>or</Text>
              <View style={styles.orDividerLine} />
            </View>

            {/* Secondary: Sign up with Google */}
            <TouchableOpacity
              style={[styles.secondaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <AntDesign name="google" size={18} color={lightColors.accent} style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Sign up with Google</Text>
            </TouchableOpacity>

            {/* Continue as Guest */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleSkip}
              activeOpacity={0.6}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Terms Text with tappable links */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>By continuing, you agree to our </Text>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('CmsPage', { slug: 'terms-conditions', title: 'Terms of Service' })}
              activeOpacity={0.7}
            >
              <Text style={styles.termsLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.termsText}> and </Text>
            <TouchableOpacity
              onPress={() => (navigation as any).navigate('CmsPage', { slug: 'privacy-policy', title: 'Privacy Policy' })}
              activeOpacity={0.7}
            >
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          {/* Developer Login (QA Only) - below the fold */}
          <View style={styles.devLoginContainer}>
            <View style={styles.devDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.devDividerText}>QA Only</Text>
              <View style={styles.dividerLine} />
            </View>
            {devError && (
              <Text style={styles.devErrorText}>{devError}</Text>
            )}
            <TouchableOpacity
              style={[styles.devLoginButton, devLoading && styles.devLoginButtonDisabled]}
              onPress={handleDevLogin}
              disabled={devLoading}
            >
              {devLoading ? (
                <ActivityIndicator size="small" color={lightColors.textSecondary} />
              ) : (
                <>
                  <Feather name="terminal" size={14} color={lightColors.textSecondary} style={styles.devButtonIcon} />
                  <Text style={styles.devLoginText}>Developer Login (QA Only)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 252, 248, 0.10)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: '#FFF8F0',
    opacity: 0.5,
  },
  safeArea: {
    flex: 1,
  },
  outerScrollView: {
    flex: 1,
  },
  outerScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },

  // === Hero Section - plain View container, NO ScrollView ===
  heroSection: {
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    overflow: 'visible',
  },

  // === Cover Flow Items - absolutely positioned ===
  coverFlowItem: {
    position: 'absolute',
    width: CAROUSEL_ITEM_WIDTH,
    height: CAROUSEL_ITEM_HEIGHT,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.30,
        shadowRadius: 24,
      },
      android: {
        elevation: 18,
      },
    }),
  },
  coverFlowItemInner: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  coverFlowImage: {
    width: '100%',
    height: '100%',
  },
  artistOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  artistOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  coverFlowPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // === Brand Section ===
  brandSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  logoContainer: {
    marginBottom: 4,
  },
  logoImage: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: lightColors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: lightColors.textSecondary,
    letterSpacing: 2.0,
    marginBottom: 4,
  },
  brandDescription: {
    fontSize: 11,
    fontWeight: '400',
    color: lightColors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: lightColors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: lightColors.textPrimary,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: lightColors.textSecondary,
  },

  // === Auth Section ===
  authSection: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: lightColors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: lightColors.accent,
  },
  secondaryButtonText: {
    color: lightColors.accent,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: lightColors.border,
  },
  orDividerText: {
    fontSize: 12,
    fontWeight: '500',
    color: lightColors.textSecondary,
    marginHorizontal: 14,
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  guestButtonText: {
    fontSize: 13,
    color: lightColors.textSecondary,
    fontWeight: '400',
  },

  // Terms
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 4,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 11,
    color: lightColors.textSecondary,
    lineHeight: 16,
  },
  termsLink: {
    fontSize: 11,
    color: lightColors.accent,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Dev Login - below fold
  devLoginContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 8,
  },
  devDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: lightColors.border,
  },
  devDividerText: {
    fontSize: 10,
    fontWeight: '600',
    color: lightColors.textSecondary,
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  devLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
    backgroundColor: lightColors.surface,
  },
  devLoginButtonDisabled: {
    opacity: 0.6,
  },
  devButtonIcon: {
    marginRight: 8,
  },
  devLoginText: {
    fontSize: 12,
    color: lightColors.textSecondary,
    fontWeight: '500',
  },
  devErrorText: {
    fontSize: 12,
    color: '#DC3545',
    marginBottom: 8,
    textAlign: 'center',
  },
});
