// src/screens/auth/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAppDispatch } from '../../store';
import { setCredentials, setGuest } from '../../store/slices/authSlice';
import { authService } from '../../services/auth.service';
import { AnimatedBackground } from '../../components/common/AnimatedBackground';
import { registerForPushNotifications } from '../../services/pushNotification.service';

// Complete any pending auth sessions (required for web-based auth)
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

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

  // Use the Google provider hook - handles Expo Go proxy and native redirects automatically
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });

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
