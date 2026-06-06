// src/screens/auth/LoginScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch } from '../../store';
import { setGuest } from '../../store/slices/authSlice';
import { AnimatedBackground } from '../../components/common/AnimatedBackground';

export const LoginScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const handleGoogleLogin = async () => {
    // Google Sign-In requires native module configuration (expo-auth-session or @react-native-google-signin)
    // For production APK: configure with EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    // For development: use the guest mode or direct backend auth
    Alert.alert(
      'Google Sign-In',
      'Google Sign-In requires native configuration. Please ensure your Google Client ID is configured in app.json and the OAuth consent screen is set up in Google Cloud Console.\n\nFor testing, use Guest Mode.',
      [{ text: 'OK' }]
    );
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
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
              <Feather name="mail" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
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
