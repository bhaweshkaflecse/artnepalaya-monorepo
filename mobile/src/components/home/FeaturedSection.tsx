import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { darkColors } from '../../theme/colors';
import { Post } from '../../services/post.service';
import { getPrimaryImageUrl } from '../../utils/media';
import { Feather } from '@expo/vector-icons';
import { FeaturedSkeleton } from '../common/SkeletonLoader';

interface FeaturedProps {
  posts: Post[];
  loading?: boolean;
}

export const FeaturedSection: React.FC<FeaturedProps> = ({ posts, loading }) => {
  const navigation = useNavigation<any>();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Feather name="award" size={16} color={darkColors.accent} />
          <Text style={styles.title}>Featured Posts</Text>
        </View>
        <FeaturedSkeleton />
      </View>
    );
  }

  if (!posts || posts.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="award" size={16} color={darkColors.accent} />
        <Text style={styles.title}>Featured Posts</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {posts.map((post) => (
          <TouchableOpacity
            key={post._id}
            style={styles.featuredCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PostDetail', { postId: post._id })}
          >
            <Image source={{ uri: getPrimaryImageUrl(post.media) }} style={styles.image} />
            <View style={styles.overlay}>
              <Text style={styles.artist} numberOfLines={1}>
                {post.authorId.username}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 280,
    height: 360,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: darkColors.surface,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  artist: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
