import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { lightColors } from '../../theme/colors';

export const CommunityPlaceholder = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Feather name="users" size={40} color={lightColors.textPrimary} />
        </View>
        <Text style={styles.title}>The Community Hub</Text>
        <Text style={styles.description}>
          We are crafting a space to bridge traditional Nepalese art forms with
          contemporary digital creators. Location-based events, artist groups,
          and interactive discussions are launching in Phase 2.
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Feather
              name="map-pin"
              size={20}
              color={lightColors.textSecondary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>Local Exhibitions & Workshops</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather
              name="message-square"
              size={20}
              color={lightColors.textSecondary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>Creator Guilds & Chats</Text>
          </View>
          <View style={styles.featureItem}>
            <Feather
              name="calendar"
              size={20}
              color={lightColors.textSecondary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>Art Events & Meetups</Text>
          </View>
        </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
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
  featureList: {
    width: '100%',
    backgroundColor: lightColors.surface,
    padding: 20,
    borderRadius: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: lightColors.textPrimary,
    fontWeight: '500',
  },
});
