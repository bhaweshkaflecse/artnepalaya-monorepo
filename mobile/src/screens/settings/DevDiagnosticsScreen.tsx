import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useAppSelector } from '../../store';
import { selectUser, selectAccessToken, selectIsGuest } from '../../store/slices/authSlice';
import { ENV } from '../../config/env';

const SHARE_BASE_URL =
  process.env.EXPO_PUBLIC_SHARE_BASE_URL || 'https://app.artnepalaya.com';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const DevDiagnosticsScreen = () => {
  const navigation = useNavigation();
  const user = useAppSelector(selectUser);
  const accessToken = useAppSelector(selectAccessToken);
  const isGuest = useAppSelector(selectIsGuest);

  const [healthStatus, setHealthStatus] = useState<string>('Not checked');
  const [healthLoading, setHealthLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('Unknown');
  const [pushToken, setPushToken] = useState<string>('Not retrieved');

  // Determine environment
  const environment = __DEV__ ? 'development' : 'production';
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber || 'N/A'
      : Constants.expoConfig?.android?.versionCode?.toString() || 'N/A';

  // Google Sign-In config status
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleSignInStatus = googleWebClientId ? 'Configured' : 'MISSING';

  useEffect(() => {
    checkNotificationPermission();
    getPushToken();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status);
    } catch (e) {
      setNotificationPermission('Error checking');
    }
  };

  const getPushToken = async () => {
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        'bb44fc58-146f-4483-b61f-c9b7edbad4e6';
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      setPushToken(tokenData.data);
    } catch (_e) {
      setPushToken('Failed to retrieve');
    }
  };

  const checkHealth = async () => {
    setHealthLoading(true);
    setHealthStatus('Checking...');
    try {
      const baseUrl = ENV.SOCKET_URL || ENV.API_URL.replace(/\/api\/v1\/?$/, '');
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(`OK (${response.status}) - ${JSON.stringify(data).substring(0, 100)}`);
      } else {
        setHealthStatus(`Error: ${response.status} ${response.statusText}`);
      }
    } catch (e: any) {
      setHealthStatus(`Failed: ${e.message || 'Network error'}`);
    } finally {
      setHealthLoading(false);
    }
  };

  const openDeepLink = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.warn('Failed to open URL:', url, err);
    });
  };

  const getAllDiagnostics = (): string => {
    const lines: string[] = [
      '=== ArtNepalaya Diagnostics ===',
      '',
      '--- App Info ---',
      `Version: ${appVersion}`,
      `Build Number: ${buildNumber}`,
      `Environment: ${environment}`,
      '',
      '--- Configuration ---',
      `API URL: ${ENV.API_URL}`,
      `Socket URL: ${ENV.SOCKET_URL}`,
      `Share Base URL: ${SHARE_BASE_URL}`,
      '',
      '--- Auth State ---',
      `Logged In: ${user ? 'Yes' : 'No'}`,
      `User ID: ${user?.id || 'N/A'}`,
      `Email: ${user?.email || 'N/A'}`,
      `Username: ${user?.username || 'N/A'}`,
      `Is Guest: ${isGuest}`,
      `Access Token: ${accessToken ? '[PRESENT]' : '[ABSENT]'}`,
      '',
      '--- Push Notifications ---',
      `Permission: ${notificationPermission}`,
      `Push Token: ${pushToken}`,
      '',
      '--- Device Info ---',
      `Platform: ${Platform.OS}`,
      `OS Version: ${Platform.Version}`,
      `Brand: ${Device.brand || 'N/A'}`,
      `Model: ${Device.modelName || 'N/A'}`,
      `Screen: ${screenWidth}x${screenHeight}`,
      '',
      '--- Backend Health ---',
      `Status: ${healthStatus}`,
      '',
      '--- Google Sign-In ---',
      `Status: ${googleSignInStatus}`,
      '',
      `Generated: ${new Date().toISOString()}`,
    ];
    return lines.join('\n');
  };

  const copyAll = async () => {
    const text = getAllDiagnostics();
    await Clipboard.setStringAsync(text);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dev Diagnostics</Text>
        <TouchableOpacity onPress={copyAll} style={styles.copyBtn}>
          <Feather name="copy" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Info</Text>
          <DiagRow label="Version" value={appVersion} />
          <DiagRow label="Build Number" value={buildNumber} />
          <DiagRow label="Environment" value={environment} />
        </View>

        {/* Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Configuration</Text>
          <DiagRow label="API URL" value={ENV.API_URL} />
          <DiagRow label="Socket URL" value={ENV.SOCKET_URL} />
          <DiagRow label="Share Base URL" value={SHARE_BASE_URL} />
        </View>

        {/* Auth State */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Auth State</Text>
          <DiagRow label="Logged In" value={user ? 'Yes' : 'No'} />
          <DiagRow label="User ID" value={user?.id || 'N/A'} />
          <DiagRow label="Email" value={user?.email || 'N/A'} />
          <DiagRow label="Username" value={user?.username || 'N/A'} />
          <DiagRow label="Is Guest" value={String(isGuest)} />
          <DiagRow
            label="Access Token"
            value={accessToken ? '[PRESENT]' : '[ABSENT]'}
          />
        </View>

        {/* Push Notifications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Push Notifications</Text>
          <DiagRow label="Permission" value={notificationPermission} />
          <DiagRow label="Push Token" value={pushToken} />
        </View>

        {/* Device Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Device Info</Text>
          <DiagRow label="Platform" value={Platform.OS} />
          <DiagRow label="OS Version" value={String(Platform.Version)} />
          <DiagRow label="Brand" value={Device.brand || 'N/A'} />
          <DiagRow label="Model" value={Device.modelName || 'N/A'} />
          <DiagRow label="Screen" value={`${screenWidth}x${screenHeight}`} />
        </View>

        {/* Backend Health */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backend Health</Text>
          <DiagRow label="Status" value={healthStatus} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={checkHealth}
            disabled={healthLoading}
          >
            {healthLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.actionBtnText}>Check Health</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Deep Link Test */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deep Link Test</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openDeepLink('artnepalaya://p/test')}
          >
            <Text style={styles.actionBtnText}>Open artnepalaya://p/test</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { marginTop: 8 }]}
            onPress={() => openDeepLink('https://app.artnepalaya.com/p/test')}
          >
            <Text style={styles.actionBtnText}>Open https://app.artnepalaya.com/p/test</Text>
          </TouchableOpacity>
        </View>

        {/* Google Sign-In */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Google Sign-In</Text>
          <DiagRow label="EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" value={googleSignInStatus} />
        </View>

        {/* Copy All Button */}
        <TouchableOpacity style={styles.copyAllBtn} onPress={copyAll}>
          <Feather name="clipboard" size={18} color="#FFFFFF" />
          <Text style={styles.copyAllBtnText}>Copy All</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

/** A single diagnostic row */
const DiagRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.diagRow}>
    <Text style={styles.diagLabel}>{label}</Text>
    <Text style={styles.diagValue} selectable>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  copyBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF3B30',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  diagLabel: {
    fontSize: 13,
    color: '#A0A0A0',
    flex: 1,
  },
  diagValue: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1.5,
    textAlign: 'right',
  },
  actionBtn: {
    backgroundColor: '#333333',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  copyAllBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
