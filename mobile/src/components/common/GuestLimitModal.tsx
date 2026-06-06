import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GuestLimitModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSignIn: () => void;
}

export const GuestLimitModal: React.FC<GuestLimitModalProps> = ({ visible, onDismiss, onSignIn }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Ionicons name="color-palette-outline" size={48} color="#FF3B30" style={styles.icon} />
          <Text style={styles.heading}>Sign in to discover more art</Text>
          <Text style={styles.subtext}>
            Save your favorites, and support creators
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={onSignIn}>
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
    marginBottom: 24,
  },
  icon: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121212',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 15,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: 12,
  },
  dismissText: {
    color: '#6C757D',
    fontSize: 15,
  },
});
