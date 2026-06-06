import React, { useEffect, useState, useCallback } from 'react';
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
import { darkColors } from '../../theme/colors';
import { notificationService, Notification } from '../../services/notification.service';

type FilterType = 'all' | 'unread' | 'read';

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

const getNotificationMessage = (notification: Notification): string => {
  const senderName = notification.senderId?.username || 'Someone';
  switch (notification.type) {
    case 'Like':
      return `${senderName} liked your post`;
    case 'Follow':
      return `${senderName} started following you`;
    case 'Save':
      return `${senderName} saved your post`;
    case 'Comment':
      return `${senderName} commented on your post`;
    case 'AdminBroadcast':
      return notification.title ? `${notification.title}: ${notification.message}` : notification.message;
    case 'System':
      return notification.message;
    default:
      return notification.message;
  }
};

export const NotificationsScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const fetchNotifications = useCallback(async (filter: FilterType) => {
    try {
      const response = await notificationService.getNotifications(filter);
      setNotifications(response.data);
    } catch (_e) {
      // Silently fail for MVP
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchNotifications(activeFilter);
  }, [activeFilter, fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(activeFilter);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (_e) {
      // Silently fail
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={[styles.notificationItem, !item.isRead && styles.unreadItem]}>
      <View style={styles.senderAvatar}>
        {item.senderId?.avatarUrl ? (
          <Image source={{ uri: item.senderId.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Feather
            name={item.type === 'AdminBroadcast' ? 'bell' : 'user'}
            size={18}
            color={darkColors.textSecondary}
          />
        )}
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText} numberOfLines={2}>
          {getNotificationMessage(item)}
        </Text>
        <Text style={styles.notificationTime}>{getTimeAgo(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </View>
  );

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
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkColors.accent} />
        </View>
      ) : (
        <FlatList
          data={notifications}
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
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
});
