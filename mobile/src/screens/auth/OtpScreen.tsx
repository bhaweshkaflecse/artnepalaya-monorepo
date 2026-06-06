// src/screens/auth/OtpScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { authService } from '../../services/auth.service';
import { useAppSelector } from '../../store';

export const OtpScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const otpRefs = useRef<Array<any>>([]);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      await authService.sendOtp(`+977${phoneNumber}`, accessToken || '');
      setOtpSent(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await authService.verifyOtp(`+977${phoneNumber}`, otpString, 'device-id', accessToken || '');
      // Navigation will happen automatically via auth state change
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Feather name="phone" size={32} color={colors.accent} />
            <Text style={styles.title}>Phone Verification</Text>
            <Text style={styles.subtitle}>
              {otpSent
                ? 'Enter the 6-digit code sent to your phone'
                : 'Enter your phone number to receive a verification code'}
            </Text>
          </View>

          {/* Phone Input */}
          {!otpSent && (
            <View style={styles.phoneContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+977</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          )}

          {/* OTP Input */}
          {otpSent && (
            <View style={styles.otpContainer}>
              {otp.map((digit: string, index: number) => (
                <TextInput
                  key={index}
                  ref={(ref: any) => { otpRefs.current[index] = ref; }}
                  style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(value: string) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }: { nativeEvent: { key: string } }) =>
                    handleOtpKeyPress(nativeEvent.key, index)
                  }
                />
              ))}
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={otpSent ? handleVerify : handleSendOtp}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>
              {loading ? 'Please wait...' : otpSent ? 'Verify' : 'Send OTP'}
            </Text>
          </TouchableOpacity>

          {/* Resend */}
          {otpSent && (
            <TouchableOpacity style={styles.resendButton} onPress={handleSendOtp}>
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  countryCode: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.textPrimary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  otpBoxFilled: {
    borderColor: colors.accent,
    backgroundColor: '#FFF5F5',
  },
  actionButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: colors.accent,
  },
});
