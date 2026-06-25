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
  FlatList,
  Image,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH * 0.58;
const CAROUSEL_ITEM_SPACING = 12;
const CAROUSEL_ITEM_FULL = CAROUSEL_ITEM_WIDTH + CAROUSEL_ITEM_SPACING;
const CAROUSEL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.26, 200);

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
  const carouselRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

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

  // Auto-scroll carousel (gated by screen focus)
  useFocusEffect(
    useCallback(() => {
      if (authBackgroundMedia.length <= 1) return;

      autoScrollTimer.current = setInterval(() => {
        setActiveCarouselIndex((prev) => {
          const next = (prev + 1) % authBackgroundMedia.length;
          carouselRef.current?.scrollToOffset({
            offset: next * CAROUSEL_ITEM_FULL,
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
    }, [authBackgroundMedia.length])
  );

  /**
   * IMPORTANT: Google OAuth in Expo Go (SDK 50)
   * 
   * The Expo auth proxy (auth.expo.io) has been deprecated and Google now rejects
   * exp:// redirect URIs. This means Google Sign-In CANNOT work in Expo Go.
   * 
   * For development: Use the "Developer Login" button below (visible in __DEV__ mode).
   * For production: Build with EAS Dev Client. See /GOOGLE_OAUTH_MIGRATION.md for full guide.
   * 
   * The Google button below is kept for when running in an EAS Development Build
   * where native Google Sign-In will work with proper client IDs.
   */
  // Use the Google provider hook - handles Expo Go proxy and native redirects automatically
  // Only use the web client ID in Expo Go to force the Expo auth proxy flow
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  });

  // Debug: log request configuration to verify correct redirect and response type
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

  // Handle the auth response when it comes back
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
      // Generate or retrieve a device identifier
      let deviceId = await SecureStore.getItemAsync('deviceId');
      if (!deviceId) {
        deviceId = getDeviceId();
        await SecureStore.setItemAsync('deviceId', deviceId);
      }

      // Send the Google ID token to the backend for verification and JWT exchange
      const authResponse = await authService.googleLogin(idToken, deviceId);

      const { user, accessToken, refreshToken } = authResponse.data;

      // Persist tokens and user data securely
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      // Update Redux auth state - this triggers navigation to MainTabs
      dispatch(setCredentials({ user, accessToken, refreshToken }));

      // Register for push notifications after successful login
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

    // Generate a unique guest username
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

    // Store a default display name for guests
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

  const handleSignUp = () => {
    navigation.navigate('SignUp');
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

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveCarouselIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Render carousel item with Cover Flow interpolation
  const renderCarouselItem = useCallback(({ item, index }: { item: { url: string; type: string; color?: string; artist?: string; caption?: string }; index: number }) => {
    const inputRange = [
      (index - 2) * CAROUSEL_ITEM_FULL,
      (index - 1) * CAROUSEL_ITEM_FULL,
      index * CAROUSEL_ITEM_FULL,
      (index + 1) * CAROUSEL_ITEM_FULL,
      (index + 2) * CAROUSEL_ITEM_FULL,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.65, 0.78, 1.0, 0.78, 0.65],
      extrapolate: 'clamp',
    });

    const rotateY = scrollX.interpolate({
      inputRange,
      outputRange: ['18deg', '12deg', '0deg', '-12deg', '-18deg'],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 0.6, 1.0, 0.6, 0.3],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.carouselItem,
          {
            transform: [{ scale }, { rotateY }, { perspective: 1000 }],
            opacity,
          },
        ]}
      >
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
          <View style={[styles.carouselPlaceholder, { backgroundColor: item.color || lightColors.surface }]}>
            <Feather name="image" size={32} color={lightColors.textSecondary} />
          </View>
        )}
      </Animated.View>
    );
  }, [scrollX]);

  // Placeholder carousel items when no media is loaded (solid color surfaces, no external network)
  const placeholderMedia = [
    { url: '', type: 'placeholder' as const, color: lightColors.surface },
    { url: '', type: 'placeholder' as const, color: lightColors.border },
    { url: '', type: 'placeholder' as const, color: lightColors.surface },
  ];

  const carouselData = authBackgroundMedia.length > 0 ? authBackgroundMedia : placeholderMedia;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero Carousel Section */}
          <View style={styles.carouselSection}>
            <Animated.FlatList
              ref={carouselRef}
              data={carouselData}
              renderItem={renderCarouselItem}
              keyExtractor={(_, index) => `carousel-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CAROUSEL_ITEM_FULL}
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContainer}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
            />
            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
              {carouselData.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.paginationDot,
                    index === activeCarouselIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Branding Section */}
          <Animated.View
            style={[
              styles.brandingSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.brandName}>ArtNepalaya</Text>
            <Text style={styles.tagline}>Discover {'\u00B7'} Share {'\u00B7'} Inspire</Text>
          </Animated.View>

          {/* Statistics - Ultra-compact inline */}
          <Animated.View
            style={[
              styles.statsInline,
              { opacity: fadeAnim },
            ]}
          >
            <Text style={styles.statsInlineText}>
              18K+ Artists  {'\u00B7'}  75K+ Artworks  {'\u00B7'}  Made in Nepal {'\u{1F1F3}\u{1F1F5}'}
            </Text>
          </Animated.View>

          {/* Authentication Buttons */}
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
                  <Feather name="mail" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Secondary: Sign up with Google */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSignUp}
              activeOpacity={0.7}
            >
              <Feather name="mail" size={18} color={lightColors.accent} style={styles.buttonIcon} />
              <Text style={styles.secondaryButtonText}>Sign up with Google</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Continue as Guest */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleSkip}
            activeOpacity={0.6}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>

          {/* Terms Text */}
          <Text style={styles.termsText}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>

          {/* Developer Login (QA Only) */}
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
    backgroundColor: lightColors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // Carousel
  carouselSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  carouselContainer: {
    paddingHorizontal: (SCREEN_WIDTH - CAROUSEL_ITEM_WIDTH) / 2 - CAROUSEL_ITEM_SPACING / 2,
  },
  carouselItem: {
    width: CAROUSEL_ITEM_WIDTH,
    height: CAROUSEL_HEIGHT,
    marginHorizontal: CAROUSEL_ITEM_SPACING / 2,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: lightColors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
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
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: lightColors.border,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 22,
    borderRadius: 4,
    backgroundColor: lightColors.accent,
  },

  // Branding
  brandingSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: lightColors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: lightColors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // Statistics - inline
  statsInline: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statsInlineText: {
    fontSize: 11,
    fontWeight: '500',
    color: lightColors.textSecondary,
    textAlign: 'center',
  },

  // Auth Buttons
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
    backgroundColor: 'transparent',
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

  // Continue as Guest
  guestButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  guestButtonText: {
    fontSize: 13,
    color: lightColors.textSecondary,
    fontWeight: '400',
  },

  // Terms
  termsText: {
    fontSize: 10,
    color: lightColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 48,
    lineHeight: 14,
    marginBottom: 12,
    opacity: 0.7,
  },

  // Dev Login
  devLoginContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  devDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
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
