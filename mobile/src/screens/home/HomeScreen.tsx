import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  ViewToken,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppStack';
import { useAppDispatch, useAppSelector } from '../../store';
import { incrementGuestViews, logout } from '../../store/slices/authSlice';
import { fetchFeed, fetchMoreFeed, fetchFeatured } from '../../store/slices/feedSlice';
import { PostCard } from '../../components/home/PostCard';
import { FeaturedSection } from '../../components/home/FeaturedSection';
import { PostCardSkeleton } from '../../components/common/SkeletonLoader';
import { GuestLimitModal } from '../../components/common/GuestLimitModal';
import { Post } from '../../services/post.service';
import { notificationService } from '../../services/notification.service';

export const HomeScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const { feedPosts, featuredPosts, isLoadingFeed, isLoadingFeatured, isLoadingMore, hasNextPage } =
    useAppSelector((state) => state.feed);
  const { isGuest, guestPostsViewed } = useAppSelector((state) => state.auth);

  const viewedPostIds = useRef<Set<string>>(new Set()).current;
  const [modalDismissed, setModalDismissed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const showGuestModal = isGuest && guestPostsViewed >= 15 && !modalDismissed;

  const fetchUnreadCount = useCallback(async () => {
    if (isGuest) return;
    try {
      const response = await notificationService.getNotifications('unread', 1, 1);
      setUnreadCount(response.meta.total ?? 0);
    } catch (error) {
      // Silently handle notification fetch failure
    }
  }, [isGuest]);

  useEffect(() => {
    dispatch(fetchFeed());
    dispatch(fetchFeatured());
    fetchUnreadCount();
  }, [dispatch, fetchUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  const handleRefresh = () => {
    dispatch(fetchFeed());
    dispatch(fetchFeatured());
  };

  const handleEndReached = () => {
    if (hasNextPage && !isLoadingMore && !isLoadingFeed) {
      dispatch(fetchMoreFeed());
    }
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!isGuest) return;
      viewableItems.forEach((viewable) => {
        const postId = viewable.item?._id;
        if (postId && !viewedPostIds.has(postId)) {
          viewedPostIds.add(postId);
          dispatch(incrementGuestViews());
        }
      });
    },
    [isGuest, dispatch, viewedPostIds]
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderHeader = () => (
    <>
      <View style={styles.topBar}>
        <Text style={styles.logo}>ARTNEPALAYA</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.bellContainer}>
          <Feather name="bell" size={24} color="#FFFFFF" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <FeaturedSection posts={featuredPosts} loading={isLoadingFeatured} />
      <View style={styles.dividerContainer}>
        <Text style={styles.dividerText}>Latest Artworks</Text>
        <View style={styles.dividerLine} />
      </View>
    </>
  );

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <PostCardSkeleton />
        </View>
      );
    }
    if (!hasNextPage && feedPosts.length > 0) {
      return (
        <View style={styles.caughtUpContainer}>
          <Feather name="check-circle" size={32} color="#A0A0A0" />
          <Text style={styles.caughtUpText}>You're all caught up</Text>
          <Text style={styles.caughtUpSubtext}>Check back later for more artworks</Text>
        </View>
      );
    }
    return null;
  };

  const renderItem = ({ item }: { item: Post }) => <PostCard post={item} />;

  if (isLoadingFeed && feedPosts.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.topBar}>
          <Text style={styles.logo}>ARTNEPALAYA</Text>
          <Feather name="bell" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.skeletonList}>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={feedPosts}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingFeed && feedPosts.length > 0}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        style={styles.flatList}
      />
      <GuestLimitModal
        visible={showGuestModal}
        onDismiss={() => setModalDismissed(true)}
        onSignIn={() => {
          dispatch(logout());
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flatList: {
    backgroundColor: '#000000',
  },
  listContent: {
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#FFFFFF',
  },
  skeletonList: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 12,
  },
  footerLoader: {
    paddingVertical: 16,
  },
  caughtUpContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caughtUpText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  caughtUpSubtext: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
