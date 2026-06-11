import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../../services/api';

interface PopupData {
  heading: string;
  icon?: string;
  body: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
}

const getIconName = (icon?: string): keyof typeof Feather.glyphMap => {
  switch (icon) {
    case 'warning':
      return 'alert-triangle';
    case 'survey':
      return 'clipboard';
    case 'update':
      return 'download';
    case 'celebration':
      return 'gift';
    case 'info':
    default:
      return 'info';
  }
};

export const GlobalPopupModal = () => {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [visible, setVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (hasShown) return;

    const fetchPopup = async () => {
      try {
        const response = await api.get('/config/global-popup');
        const data = response.data.data;
        if (data && data.isActive) {
          setPopup(data);
          setVisible(true);
          setHasShown(true);
        }
      } catch (_e) {
        // Silently fail - popup is non-critical
      }
    };

    fetchPopup();
  }, [hasShown]);

  const handleCta = () => {
    if (popup?.ctaLink) {
      Linking.openURL(popup.ctaLink).catch(() => {});
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!popup) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Feather name="x" size={22} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Feather
              name={getIconName(popup.icon)}
              size={32}
              color="#DC2626"
            />
          </View>

          {/* Heading */}
          <Text style={styles.heading}>{popup.heading}</Text>

          {/* Body */}
          <Text style={styles.body}>{popup.body}</Text>

          {/* CTA Button */}
          {popup.ctaText && (
            <TouchableOpacity style={styles.ctaBtn} onPress={handleCta}>
              <Text style={styles.ctaText}>{popup.ctaText}</Text>
            </TouchableOpacity>
          )}

          {/* Dismiss */}
          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={styles.dismissText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  ctaBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
