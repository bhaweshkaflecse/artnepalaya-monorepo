import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppStack';
import { darkColors } from '../../theme/colors';
import { notificationService, NotificationGroup } from '../../services/notification.service';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectIsGuest, selectUser, logout } from '../../store/slices/authSlice';
import {
  setNotifications,
  upsertNotification,
  markNotificationRead,
  markAllRead,
  selectNotifications,
  selectNotificationsLoaded,
} from '../../store/slices/notificationSlice';

type FilterType = 'all' | 'unread' | 'read';

// Display thresholds for actor formatting
const SHOW_NAMES_THRESHOLD = 2;
const SHOW_NAMES_AND_OTHERS_THRESHOLD = 20;

const getTimeAgo = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Formats grouped notification message based on actorCount and type.
 *
 * Display rules:
 * - actorCount === 1: "Username liked your artwork"
 * - actorCount === 2: "User1 and User2 liked your artwork"
 * - actorCount 3-20: "User1, User2 and N others liked your artwork"
 * - actorCount > 20: "N people liked your artwork"
 */
const formatGroupedMessage = (notification: NotificationGroup): string => {
  const { type, actorCount, recentActors, title, message } = notification;

  // AdminBroadcast and System do not use actors
  if (type === 'AdminBroadcast') {
    return title ? `${title}: ${message || ''}` : message || '';
  }
  if (type === 'System') {
    return message || '';
  }

  const actionText = getActionText(type, actorCount);
  const actorText = getActorText(actorCount, recentActors);

  return `${actorText} ${actionText}`;
};

const getActionText = (type: NotificationGroup['type'], actorCount: number): string => {
  switch (type) {
    case 'Like':
      return 'liked your artwork';
    case 'Save':
      return 'saved your artwork';
    case 'Follow':
      return actorCount > 1 ? 'started following you' : 'started following you';
    case 'Comment':
      return 'commented on your artwork';
    case 'Mention':
      return 'mentioned you';
    case 'Reply':
      return 'replied to your comment';
    case 'ArtworkApproved':
      return 'Your artwork has been approved';
    case 'ArtworkRejected':
      return 'Your artwork was not approved';
    default:
      return '';
  }
};

const getActorText = (
  actorCount: number,
  recentActors: Array<{ _id: string; username: string; avatarUrl?: string }>
): string => {
  if (actorCount === 0) return '';

  const name1 = recentActors[0]?.username || 'Someone';

  if (actorCount === 1) {
    return name1;
  }

  if (actorCount === 2) {
    const name2 = recentActors[1]?.username || 'someone';
    return `${name1} and ${name2}`;
  }

  if (actorCount <= SHOW_NAMES_AND_OTHERS_THRESHOLD) {
    const name2 = recentActors[1]?.username || 'someone';
    const othersCount = actorCount - 2;
    return `${name1}, ${name2} and ${othersCount} others`;
  }

  // actorCount > 20
  return `${actorCount} people`;
};

export const NotificationsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector(selectIsGuest);
  const currentUser = useAppSelector(selectUser);
  const storeNotifications = useAppSelector(selectNotifications);
  const notificationsLoaded = useAppSelector(selectNotificationsLoaded);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filter notifications based on active filter
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return storeNotifications;
    if (activeFilter === 'unread') return storeNotifications.filter((n) => !n.isRead);
    return storeNotifications.filter((n) => n.isRead);
  }, [storeNotifications, activeFilter]);

  // Guest mode - show static info screen
  if (isGuest) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.guestContainer}>
          <Feather name="bell" size={56} color={darkColors.textSecondary} />
          <Text style={styles.guestTitle}>Notifications are available for registered users.</Text>
          <Text style={styles.guestSubtext}>Stay updated with:</Text>
          <View style={styles.guestBulletList}>
            <Text style={styles.guestBullet}>{'\u2022'} Likes on your artwork</Text>
            <Text style={styles.guestBullet}>{'\u2022'} New followers</Text>
            <Text style={styles.guestBullet}>{'\u2022'} Featured alerts</Text>
            <Text style={styles.guestBullet}>{'\u2022'} Community updates</Text>
          </View>
          <TouchableOpacity style={styles.guestSignInBtn} onPress={() => dispatch(logout())} activeOpacity={0.7}>
            <Feather name="log-in" size={18} color="#FFFFFF" />
            <Text style={styles.guestSignInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const fetchNotifications = useCallback(async () => {
    try {
      // Always fetch 'all' from the API and filter client-side from Redux
      const response = await notificationService.getNotifications('all');
      dispatch(setNotifications(response.data));
    } catch (_e) {
      // Silently fail for MVP
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!notificationsLoaded) {
      setIsLoading(true);
    }
    fetchNotifications();
  }, [fetchNotifications, notificationsLoaded]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      dispatch(markAllRead());
    } catch (_e) {
      // Silently fail
    }
  };

  const handleNotificationPress = async (notification: NotificationGroup) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await notificationService.markOneAsRead(notification._id);
        dispatch(markNotificationRead(notification._id));
      } catch (_e) {
        // Silently fail
      }
    }

    const { type, actorCount, recentActors, targetId } = notification;

    // Extract postId from targetId
    const postId = targetId
      ? (typeof targetId === 'string' ? targetId : targetId._id)
      : null;

    if (postId && (type === 'Like' || type === 'Save' || type === 'Comment' || type === 'Mention' || type === 'Reply')) {
      // Navigate to the post
      navigation.navigate('PostDetail', { postId });
    } else if (type === 'Follow') {
      if (actorCount === 1 && recentActors[0]) {
        // Navigate to the single follower's profile
        const actorId = recentActors[0]._id;
        if (currentUser && actorId === currentUser.id) {
          navigation.navigate('MainTabs' as any, { screen: 'Profile' } as any);
        } else {
          navigation.navigate('UserProfile', { userId: actorId });
        }
      } else {
        // Multiple followers - just mark as read (already done above)
        // Could navigate to followers list in the future
      }
    } else if (type === 'ArtworkApproved' || type === 'ArtworkRejected') {
      // Navigate to the post if targetId available
      if (postId) {
        navigation.navigate('PostDetail', { postId });
      }
    } else {
      // Toggle expand/collapse for AdminBroadcast, System, etc.
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(notification._id)) {
          next.delete(notification._id);
        } else {
          next.add(notification._id);
        }
        return next;
      });
    }
  };

  const renderAvatar = (notification: NotificationGroup) => {
    const { type, actorCount, recentActors } = notification;

    // AdminBroadcast: show bell icon
    if (type === 'AdminBroadcast' || type === 'System') {
      return (
        <View style={styles.senderAvatar}>
          <Feather name="bell" size={18} color={darkColors.textSecondary} />
        </View>
      );
    }

    const firstActor = recentActors[0];
    const hasAvatar = firstActor?.avatarUrl;

    return (
      <View style={styles.avatarContainer}>
        <View style={styles.senderAvatar}>
          {hasAvatar ? (
            <Image source={{ uri: firstActor.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Feather name="user" size={18} color={darkColors.textSecondary} />
          )}
        </View>
        {actorCount > 1 && (
          <View style={styles.actorBadge}>
            <Text style={styles.actorBadgeText}>+{Math.min(actorCount - 1, 99)}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderNotification = ({ item }: { item: NotificationGroup }) => {
    const isExpanded = expandedIds.has(item._id);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.notificationItem, !item.isRead && styles.unreadItem]}>
          {renderAvatar(item)}
          <View style={styles.notificationContent}>
            <Text
              style={styles.notificationText}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {formatGroupedMessage(item)}
            </Text>
            <Text style={styles.notificationTime}>
              {getTimeAgo(item.latestActivityAt)}
            </Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
          <Feather name="check-circle" size={20} color={darkColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'unread', 'read'] as FilterType[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter && styles.filterTabTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading && !notificationsLoaded ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkColors.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="bell-off" size={48} color={darkColors.textSecondary} />
              <Text style={styles.emptyText}>No notifications</Text>
              <Text style={styles.emptySubtext}>
                You will see notifications here when someone interacts with your content
              </Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  markReadBtn: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: darkColors.surface,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: darkColors.textPrimary,
  },
  filterTabTextActive: {
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  unreadItem: {
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  actorBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: darkColors.accent,
    borderRadius: 8,
    minWidth: 18,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: darkColors.background,
  },
  actorBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: darkColors.textSecondary,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: darkColors.accent,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: darkColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  guestSubtext: {
    fontSize: 14,
    color: darkColors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  guestBulletList: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingLeft: 24,
  },
  guestBullet: {
    fontSize: 14,
    color: darkColors.textSecondary,
    lineHeight: 24,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkColors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 28,
    gap: 8,
  },
  guestSignInText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
