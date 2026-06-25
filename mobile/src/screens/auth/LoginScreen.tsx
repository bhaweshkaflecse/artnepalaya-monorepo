// src/screens/auth/LoginScreen.tsx
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
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAppDispatch, useAppSelector } from '../../store';
import { setCredentials, setGuest } from '../../store/slices/authSlice';
import { fetchAuthConfig } from '../../store/slices/appSlice';
import { api } from '../../services/api';
import { authService } from '../../services/auth.service';
import { lightColors } from '../../theme/colors';
import { registerForPushNotifications } from '../../services/pushNotification.service';

// Complete any pending auth sessions (required for web-based auth)
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration - Only web client ID is used in Expo Go
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Cover Flow sizing: center item at ~55% of screen width so neighbors (~30% visible) fit
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH * 0.55;
const CAROUSEL_ITEM_HEIGHT = CAROUSEL_ITEM_WIDTH * (4 / 3);
const CAROUSEL_ITEM_SPACING = 8;
const CAROUSEL_ITEM_FULL = CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING;
const CAROUSEL_HEIGHT = Math.max(SCREEN_HEIGHT * 0.40, CAROUSEL_ITEM_HEIGHT + 32);
// How far neighbors translate inward to create the classic Cover Flow overlap effect
const SIDE_OVERLAP_INWARD = CAROUSEL_ITEM_WIDTH * 0.28;

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

  // Carousel state
  const authBackgroundMedia = useAppSelector((state) => state.app.authBackgroundMedia);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const isUserScrolling = useRef(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Fetch fresh auth background media on mount
  useEffect(() => {
    dispatch(fetchAuthConfig());
  }, [dispatch]);

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

  const baseData = authBackgroundMedia.length > 0 ? authBackgroundMedia : placeholderMedia;

  // Circular carousel: prepend last item, append first item
  const carouselData = baseData.length > 1
    ? [baseData[baseData.length - 1], ...baseData, baseData[0]]
    : baseData;

  const realItemCount = baseData.length;
  const hasCircular = baseData.length > 1;

  // Initial scroll offset (to position 1 which is the real first item)
  const initialOffset = hasCircular ? CAROUSEL_ITEM_FULL : 0;

  // Set initial scroll position after mount
  useEffect(() => {
    if (hasCircular && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: initialOffset, animated: false });
      }, 50);
    }
  }, [hasCircular, initialOffset]);

  // Handle circular scroll reset (snap to real item when landing on clones)
  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offsetX / CAROUSEL_ITEM_FULL);

    if (hasCircular) {
      if (currentIndex === 0) {
        // Landed on prepended clone (last item) -> jump to real last
        const realLastOffset = realItemCount * CAROUSEL_ITEM_FULL;
        scrollViewRef.current?.scrollTo({ x: realLastOffset, animated: false });
        setActiveCarouselIndex(realItemCount - 1);
      } else if (currentIndex === realItemCount + 1) {
        // Landed on appended clone (first item) -> jump to real first
        const realFirstOffset = CAROUSEL_ITEM_FULL;
        scrollViewRef.current?.scrollTo({ x: realFirstOffset, animated: false });
        setActiveCarouselIndex(0);
      } else {
        setActiveCarouselIndex(currentIndex - 1);
      }
    } else {
      setActiveCarouselIndex(currentIndex);
    }
    isUserScrolling.current = false;
  }, [hasCircular, realItemCount]);

  // Auto-scroll carousel (gated by screen focus)
  useFocusEffect(
    useCallback(() => {
      if (realItemCount <= 1) return;

      autoScrollTimer.current = setInterval(() => {
        if (isUserScrolling.current) return;

        setActiveCarouselIndex((prev) => {
          const next = (prev + 1) % realItemCount;
          // In circular mode, real items are offset by 1
          const scrollIndex = hasCircular ? next + 1 : next;
          scrollViewRef.current?.scrollTo({
            x: scrollIndex * CAROUSEL_ITEM_FULL,
            animated: true,
          });
          return next;
        });
      }, 4000);

      return () => {
        if (autoScrollTimer.current) {
          clearInterval(autoScrollTimer.current);
          autoScrollTimer.current = null;
        }
      };
    }, [realItemCount, hasCircular])
  );

  /**
   * IMPORTANT: Google OAuth in Expo Go (SDK 50)
   */
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  });

  useEffect(() => {
    if (request) {
      console.log('[GoogleAuth] Request configured:', {
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        responseType: request.responseType,
        usePKCE: request.usePKCE,
      });
    }
  }, [request]);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (idToken) {
        handleAuthSuccess(idToken);
      }
    } else if (response?.type === 'error') {
      console.warn('[GoogleAuth] Error:', response.error);
      Alert.alert(
        'Sign-In Failed',
        'Google authentication encountered an error. Please try again.',
        [{ text: 'OK' }]
      );
      setIsLoading(false);
    } else if (response?.type === 'dismiss') {
      setIsLoading(false);
    }
  }, [response]);

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
    if (!request) {
      Alert.alert(
        'Google Sign-In Unavailable',
        'Google authentication is not configured in this environment. ' +
          'Please ensure Google OAuth credentials are set.',
        [{ text: 'OK' }]
      );
      return;
    }
    setIsLoading(true);
    await promptAsync();
  };

  const handleSkip = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');

    let guestUsername = await SecureStore.getItemAsync('guestUsername');
    if (!guestUsername) {
      const chars = '0123456789ABCDEF';
      let random5 = '';
      for (let i = 0; i < 5; i++) {
        random5 += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      guestUsername = `Guest_${random5}`;
      await SecureStore.setItemAsync('guestUsername', guestUsername);
    }

    await SecureStore.setItemAsync('guestDisplayName', 'Guest Explorer');
    dispatch(setGuest({ guestUsername }));
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    setDevError(null);
    try {
      const res = await api.post('/auth/admin-login', {
        email: 'admin@artnepalaya.com',
        password: 'admin123',
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

  // Render a single carousel item with Cover Flow transforms
  const renderCarouselItem = (item: any, index: number) => {
    const inputRange = [
      (index - 2) * CAROUSEL_ITEM_FULL,
      (index - 1) * CAROUSEL_ITEM_FULL,
      index * CAROUSEL_ITEM_FULL,
      (index + 1) * CAROUSEL_ITEM_FULL,
      (index + 2) * CAROUSEL_ITEM_FULL,
    ];

    // Center item full size; immediate neighbors at 0.75; far items at 0.6
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 0.75, 1.0, 0.75, 0.6],
      extrapolate: 'clamp',
    });

    // 3D rotation: neighbors tilt inward at 35deg, far items at 55deg
    const rotateY = scrollX.interpolate({
      inputRange,
      outputRange: ['55deg', '35deg', '0deg', '-35deg', '-55deg'],
      extrapolate: 'clamp',
    });

    // Keep neighbors clearly visible (0.85 opacity) so users can see them
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 0.85, 1.0, 0.85, 0.4],
      extrapolate: 'clamp',
    });

    // Pull neighbors inward to create visual overlap (classic Cover Flow)
    // This makes the center card appear to overlap the side cards
    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [
        SIDE_OVERLAP_INWARD * 1.8,
        SIDE_OVERLAP_INWARD,
        0,
        -SIDE_OVERLAP_INWARD,
        -SIDE_OVERLAP_INWARD * 1.8,
      ],
      extrapolate: 'clamp',
    });

    // Z-index simulation: center item on top, neighbors behind
    const zIndex = scrollX.interpolate({
      inputRange: [
        (index - 1) * CAROUSEL_ITEM_FULL,
        index * CAROUSEL_ITEM_FULL,
        (index + 1) * CAROUSEL_ITEM_FULL,
      ],
      outputRange: [1, 10, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={`carousel-${index}`}
        style={[
          styles.carouselItem,
          {
            transform: [
              { perspective: 1000 },
              { translateX },
              { scale },
              { rotateY },
            ],
            opacity,
            zIndex,
          },
        ]}
      >
        <View style={styles.carouselItemInner}>
          {item.url ? (
            <>
              <Image
                source={{ uri: item.url }}
                style={styles.carouselImage}
                resizeMode="cover"
              />
              {item.artist ? (
                <View style={styles.artistOverlay}>
                  <Feather name="user" size={10} color="#FFFFFF" />
                  <Text style={styles.artistOverlayText}>@{item.artist}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={[styles.carouselPlaceholder, { backgroundColor: item.color || '#F0E8E0' }]}>
              <Feather name="image" size={32} color={lightColors.textSecondary} />
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Background image */}
      <Image
        source={require('../../../assets/loginimage.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Subtle overlay for readability if needed */}
      <View style={styles.backgroundOverlay} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.outerScrollView}
          contentContainerStyle={styles.outerScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* === TOP ~42% - Hero Carousel Section (ScrollView-based Cover Flow) === */}
          <View style={styles.heroSection}>
            <Animated.ScrollView
              ref={scrollViewRef as any}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CAROUSEL_ITEM_FULL}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContainer}
              onScrollBeginDrag={() => { isUserScrolling.current = true; }}
              onMomentumScrollEnd={handleScrollEnd}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              contentOffset={{ x: initialOffset, y: 0 }}
            >
              {carouselData.map((item, index) => renderCarouselItem(item, index))}
            </Animated.ScrollView>
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
            {/* App Logo */}
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

          {/* Terms Text with tappable links - final visible content before fold */}
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
    backgroundColor: 'rgba(255, 252, 248, 0.15)',
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

  // === Hero Section (Top ~40%) ===
  heroSection: {
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
    overflow: 'visible',
  },
  carouselContainer: {
    paddingHorizontal: (SCREEN_WIDTH - CAROUSEL_ITEM_WIDTH) / 2 - CAROUSEL_ITEM_SPACING / 2,
    alignItems: 'center',
  },
  carouselItem: {
    width: CAROUSEL_ITEM_WIDTH,
    height: CAROUSEL_ITEM_HEIGHT,
    marginHorizontal: CAROUSEL_ITEM_SPACING / 2,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
        overflow: 'hidden',
      },
    }),
  },
  carouselItemInner: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  carouselImage: {
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
  carouselPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // === Brand Section (Middle) ===
  brandSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  logoContainer: {
    marginBottom: 3,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 11,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: lightColors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: lightColors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  brandDescription: {
    fontSize: 11,
    fontWeight: '400',
    color: lightColors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  // Statistics Cards
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 82,
    borderWidth: 1,
    borderColor: lightColors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
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

  // === Auth Section (Bottom) ===
  authSection: {
    paddingHorizontal: 24,
    marginBottom: 6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.accent,
    paddingVertical: 13,
    borderRadius: 12,
    width: '100%',
    marginBottom: 6,
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
    paddingVertical: 11,
    borderRadius: 12,
    width: '100%',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: lightColors.accent,
  },
  secondaryButtonText: {
    color: lightColors.accent,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Or Divider
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  // Continue as Guest
  guestButton: {
    alignItems: 'center',
    paddingVertical: 6,
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
    marginBottom: 16,
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

  // Dev Login - positioned below fold
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
