import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { lightColors } from '../../theme/colors';

export const MarketplacePlaceholder = () => {
  const handleWhatsAppRedirect = () => {
    Linking.openURL('whatsapp://send?text=Hello Artnepalaya!');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Feather name="shopping-bag" size={40} color={lightColors.accent} />
        </View>
        <Text style={styles.comingSoon}>Coming Soon</Text>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.description}>
          Artnepalaya is building a dedicated space for artists and collectors
          to trade directly. Currently, if an artwork is marked "For Sale", you
          can contact the artist directly via WhatsApp.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleWhatsAppRedirect}>
          <Feather
            name="message-circle"
            size={20}
            color={lightColors.background}
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Contact via WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: lightColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  comingSoon: {
    fontSize: 13,
    fontWeight: '600',
    color: lightColors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: lightColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: lightColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: lightColors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: lightColors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
