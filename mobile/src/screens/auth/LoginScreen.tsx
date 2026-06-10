// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch } from '../../store';
import { setCredentials, setGuest } from '../../store/slices/authSlice';
import { authService } from '../../services/auth.service';
import { AnimatedBackground } from '../../components/common/AnimatedBackground';

// Google OAuth configuration
// These are set via Expo environment variables (app.config.js or .env)
let googleWebClientId = '';
let googleAndroidClientId = '';
let googleIosClientId = '';

// Attempt to read Expo public env vars if available at runtime
try {
  const envObj = ((globalThis as any).process || {}).env || {};
  googleWebClientId = envObj.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  googleAndroidClientId = envObj.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
  googleIosClientId = envObj.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
} catch {
  // Environment not available, use empty defaults
}

const GOOGLE_WEB_CLIENT_ID = googleWebClientId;
const GOOGLE_ANDROID_CLIENT_ID = googleAndroidClientId;
const GOOGLE_IOS_CLIENT_ID = googleIosClientId;

/**
 * Attempts to perform Google Sign-In using expo-auth-session.
 * Returns the Google ID token on success, or null if the module is unavailable.
 */
async function performGoogleSignIn(): Promise<string | null> {
  try {
    // Dynamically load expo-auth-session and expo-web-browser
    // These are optional dependencies that may not be installed in all environments
    let AuthSession: any;
    let WebBrowser: any;

    try {
      AuthSession = (globalThis as any).__modules?.['expo-auth-session'] ||
        (() => { throw new Error('Module not available'); })();
    } catch {
      // expo-auth-session not available - this is expected in dev
      return null;
    }

    try {
      WebBrowser = (globalThis as any).__modules?.['expo-web-browser'] ||
        (() => { throw new Error('Module not available'); })();
    } catch {
      // expo-web-browser not available
      return null;
    }

    WebBrowser.maybeCompleteAuthSession();

    const clientId = Platform.select({
      android: GOOGLE_ANDROID_CLIENT_ID,
      ios: GOOGLE_IOS_CLIENT_ID,
      default: GOOGLE_WEB_CLIENT_ID,
    });

    // Use AuthSession.makeRedirectUri for the redirect
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

    const request = new AuthSession.AuthRequest({
      clientId: clientId || GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: 'id_token',
    });

    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    };

    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.params?.id_token) {
      return result.params.id_token;
    }

    return null;
  } catch (error: any) {
    // Module not available or auth failed
    console.warn('Google Sign-In module not available:', error?.message);
    return null;
  }
}

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

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      // Attempt to get Google ID token via expo-auth-session
      const idToken = await performGoogleSignIn();

      if (!idToken) {
        Alert.alert(
          'Google Sign-In Unavailable',
          'Google authentication is not configured in this environment. ' +
            'Please ensure expo-auth-session is installed and Google OAuth credentials are set.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      // Generate or retrieve a device identifier
      let deviceId = await SecureStore.getItemAsync('deviceId');
      if (!deviceId) {
        deviceId = getDeviceId();
        await SecureStore.setItemAsync('deviceId', deviceId);
      }

      // Send the Google ID token to the backend for verification and JWT exchange
      const response = await authService.googleLogin(idToken, deviceId);

      const { user, accessToken, refreshToken } = response.data;

      // Persist tokens and user data securely
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      // Update Redux auth state - this triggers navigation to MainTabs
      dispatch(setCredentials({ user, accessToken, refreshToken }));
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

  const handleSkip = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    dispatch(setGuest());
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <View style={styles.root}>
      <AnimatedBackground />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Feather name="aperture" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>ARTNEPALAYA</Text>
            <Text style={styles.tagline}>Discover Nepali Art</Text>
          </View>

          {/* Login Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.googleButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="mail" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <TouchableOpacity style={styles.signUpLink} onPress={handleSignUp}>
            <Text style={styles.signUpText}>
              Don't have an account?{' '}
              <Text style={styles.signUpHighlight}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logoIcon: {
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#FFFFFF',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 8,
    width: '100%',
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpLink: {
    paddingVertical: 12,
  },
  signUpText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  signUpHighlight: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
