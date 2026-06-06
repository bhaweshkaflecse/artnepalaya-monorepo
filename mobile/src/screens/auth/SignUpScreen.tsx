// src/screens/auth/SignUpScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../../store';
import { setGuest } from '../../store/slices/authSlice';
import { AnimatedBackground } from '../../components/common/AnimatedBackground';

export const SignUpScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const handleGoogleSignUp = () => {
    // TODO: Implement Google OAuth sign-up flow
  };

  const handleSkip = () => {
    dispatch(setGuest());
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
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
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Create Account</Text>

          {/* Sign Up Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignUp}>
              <Feather name="mail" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.googleButtonText}>Sign up with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Link */}
          <TouchableOpacity style={styles.signInLink} onPress={handleSignIn}>
            <Text style={styles.signInText}>
              Already have an account?{' '}
              <Text style={styles.signInHighlight}>Sign In</Text>
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
    marginBottom: 32,
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
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 32,
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
  signInLink: {
    paddingVertical: 12,
  },
  signInText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  signInHighlight: {
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
