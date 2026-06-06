import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppStack';
import { darkColors } from '../../theme/colors';
import { postService, Post } from '../../services/post.service';

const CATEGORIES = ['All', 'Painting', 'Digital Art', 'Thangka', 'Sculpture', 'Illustration', 'Photography'];

const SkeletonGridItem: React.FC<{ index: number }> = ({ index }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const height = index % 2 === 0 ? 220 : 160;

  return (
    <Animated.View
      style={[
        styles.gridItem,
        { height, opacity, backgroundColor: '#2A2A2A' },
      ]}
    />
  );
};

const ExploreSkeleton: React.FC = () => {
  return (
    <View style={styles.skeletonGrid}>
      <View style={styles.skeletonColumn}>
        <SkeletonGridItem index={0} />
        <SkeletonGridItem index={2} />
        <SkeletonGridItem index={4} />
        <SkeletonGridItem index={6} />
      </View>
      <View style={styles.skeletonColumn}>
        <SkeletonGridItem index={1} />
        <SkeletonGridItem index={3} />
        <SkeletonGridItem index={5} />
        <SkeletonGridItem index={7} />
      </View>
    </View>
  );
};

export const ExploreScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await postService.getFeed(null, 30);
      setPosts(response.data);
      setCursor(response.meta.nextCursor);
      setHasMore(response.meta.hasNextPage);
    } catch (_e) {
      // silently fail for MVP
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursor) return;
    setIsLoadingMore(true);
    try {
      const response = await postService.getFeed(cursor, 30);
      setPosts((prev) => [...prev, ...response.data]);
      setCursor(response.meta.nextCursor);
      setHasMore(response.meta.hasNextPage);
    } catch (_e) {
      // silently fail for MVP
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, hasMore, isLoadingMore]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCursor(null);
    setHasMore(true);
    fetchData();
  }, [fetchData]);

  const filteredPosts = posts.filter((post) => {
    const matchesCategory =
      activeCategory === 'All' ||
      post.tags?.some((tag) =>
        tag.name.toLowerCase().includes(activeCategory.toLowerCase())
      );
    const matchesSearch =
      !searchQuery ||
      post.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      post.authorId?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderItem = ({ item, index }: { item: Post; index: number }) => {
    const imageUrl = item.media?.[0]?.url;
    const height = index % 2 === 0 ? 220 : 160;

    return (
      <TouchableOpacity
        style={[styles.gridItem, { height }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.gridImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={24} color={darkColors.textSecondary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={20} color={darkColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artworks, tags, or artists..."
            placeholderTextColor={darkColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={18} color={darkColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                activeCategory === cat && styles.categoryPillActive,
              ]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <ExploreSkeleton />
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
              colors={['#FFFFFF']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkColors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: darkColors.textPrimary,
    fontSize: 15,
  },
  categoryContainer: {
    paddingBottom: 12,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: darkColors.surface,
  },
  categoryPillActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryText: {
    color: darkColors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#000000',
  },
  gridContainer: {
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  gridItem: {
    width: '48.5%',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: darkColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonGrid: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    flex: 1,
  },
  skeletonColumn: {
    flex: 1,
    paddingHorizontal: 2,
  },
});
