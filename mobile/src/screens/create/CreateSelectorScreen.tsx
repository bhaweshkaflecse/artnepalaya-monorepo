import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { lightColors } from '../../theme/colors';

type SelectorNavProp = NativeStackNavigationProp<any>;

interface CardItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  enabled: boolean;
}

const cards: CardItem[] = [
  {
    id: 'artwork',
    title: 'Artwork Post',
    description: 'Share your artwork with the community',
    icon: 'image',
    enabled: true,
  },
  {
    id: 'community',
    title: 'Community Post',
    description: 'Share thoughts and discussions',
    icon: 'message-circle',
    enabled: false,
  },
  {
    id: 'marketplace',
    title: 'Marketplace Post',
    description: 'List artwork for sale',
    icon: 'shopping-bag',
    enabled: false,
  },
];

export const CreateSelectorScreen = () => {
  const navigation = useNavigation<SelectorNavProp>();

  const handleCardPress = (card: CardItem) => {
    if (!card.enabled) return;
    if (card.id === 'artwork') {
      navigation.navigate('CreatePost');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create</Text>
        </View>

        {/* Cards */}
        <View style={styles.cardList}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[styles.card, !card.enabled && styles.cardDisabled]}
              onPress={() => handleCardPress(card)}
              activeOpacity={card.enabled ? 0.7 : 1}
              disabled={!card.enabled}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Feather
                    name={card.icon}
                    size={26}
                    color={card.enabled ? lightColors.accent : lightColors.textSecondary}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.cardTitle, !card.enabled && styles.textDisabled]}>
                    {card.title}
                  </Text>
                  <Text style={[styles.cardDescription, !card.enabled && styles.textDisabled]}>
                    {card.description}
                  </Text>
                </View>
                {card.enabled ? (
                  <Feather name="chevron-right" size={20} color={lightColors.textSecondary} />
                ) : (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  cardList: {
    gap: 14,
    paddingTop: 8,
  },
  card: {
    backgroundColor: lightColors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: lightColors.border,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardDisabled: {
    opacity: 0.55,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: lightColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 13,
    color: lightColors.textSecondary,
    lineHeight: 18,
  },
  textDisabled: {
    color: lightColors.textSecondary,
  },
  comingSoonBadge: {
    backgroundColor: lightColors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: lightColors.textSecondary,
  },
});
