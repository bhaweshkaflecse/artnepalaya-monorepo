import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppStack';
import { lightColors } from '../../theme/colors';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchProfile, fetchMyPosts, fetchSavedPosts } from '../../store/slices/userSlice';
import { selectIsGuest, selectGuestUsername, logout } from '../../store/slices/authSlice';
import { getPrimaryImageUrl, getVideoThumbnailUrl } from '../../utils/media';
import { userService } from '../../services/user.service';

interface UserMetrics {
  totalPosts: number;
  totalLikes: number;
  totalSaves: number;
}

export const ProfileScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const authUser = useAppSelector((state) => state.auth.user);
  const isGuest = useAppSelector(selectIsGuest);
  const guestUsername = useAppSelector(selectGuestUsername);
  const { profile, myPosts, savedPosts, isLoading } = useAppSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [metrics, setMetrics] = useState<UserMetrics>({ totalPosts: 0, totalLikes: 0, totalSaves: 0 });

  // Followers/Following modal state
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listModalTitle, setListModalTitle] = useState<'Followers' | 'Following'>('Followers');
  const [listModalData, setListModalData] = useState<Array<{ _id: string; username: string; avatarUrl?: string }>>([]);
  const [listModalLoading, setListModalLoading] = useState(false);

  useEffect(() => {
    if (isGuest) return;
    dispatch(fetchProfile());
  }, [dispatch, isGuest]);

  useEffect(() => {
    if (isGuest) return;
    const userId = profile?._id || authUser?.id;
    if (userId) {
      dispatch(fetchMyPosts(userId));
      // Fetch user metrics
      userService.getUserMetrics(userId).then(setMetrics).catch(() => {});
    }
  }, [dispatch, profile, authUser, isGuest]);

  useEffect(() => {
    if (activeTab === 'saved' && !isGuest) {
      dispatch(fetchSavedPosts());
    }
  }, [activeTab, isGuest, dispatch]);

  const openFollowersList = useCallback(async () => {
    const userId = profile?._id || authUser?.id;
    if (!userId) return;
    setListModalTitle('Followers');
    setListModalData([]);
    setListModalLoading(true);
    setListModalVisible(true);
    try {
      const response = await userService.getFollowers(userId);
      setListModalData(response.data || []);
    } catch (_e) {
      // Silently fail
    } finally {
      setListModalLoading(false);
    }
  }, [profile, authUser]);

  const openFollowingList = useCallback(async () => {
    const userId = profile?._id || authUser?.id;
    if (!userId) return;
    setListModalTitle('Following');
    setListModalData([]);
    setListModalLoading(true);
    setListModalVisible(true);
    try {
      const response = await userService.getFollowing(userId);
      setListModalData(response.data || []);
    } catch (_e) {
      // Silently fail
    } finally {
      setListModalLoading(false);
    }
  }, [profile, authUser]);

  const handleListItemPress = (itemUserId: string) => {
    setListModalVisible(false);
    if (authUser && itemUserId === authUser.id) {
      // Already on own profile, just close modal
      return;
    }
    navigation.navigate('UserProfile', { userId: itemUserId });
  };

  const displayUser = profile || (authUser ? {
    _id: authUser.id,
    fullName: authUser.fullName || authUser.username,
    username: authUser.username,
    email: authUser.email,
    role: authUser.role,
    avatarUrl: authUser.avatarUrl,
    stats: { followers: 0, following: 0 },
  } : null);

  const renderPostThumbnail = ({ item }: { item: any }) => {
    const isVideo = item.media?.[0]?.type === 'video';
    const imageUrl = isVideo && item.media[0]?.url
      ? getVideoThumbnailUrl(item.media[0].url)
      : getPrimaryImageUrl(item.media || []);
    return (
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
        activeOpacity={0.8}
      >
        {imageUrl ? (
          <View style={{ flex: 1, position: 'relative' }}>
            <Image source={{ uri: imageUrl }} style={styles.gridImage} />
            {isVideo && (
              <View style={styles.videoIndicator}>
                <Feather name="play" size={12} color="#FFFFFF" />
              </View>
            )}
            {/* Content transparency badge overlays */}
            {(item.isHumanMade === false || item.isNsfw === true) && (
              <View style={styles.badgeOverlay}>
                {item.isHumanMade === false && (
                  <View style={styles.aiBadgeSmall}>
                    <Text style={styles.badgeTextSmall}>AI</Text>
                  </View>
                )}
                {item.isNsfw === true && (
                  <View style={styles.nsfwBadgeSmall}>
                    <Text style={styles.badgeTextSmall}>18+</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={20} color={lightColors.textSecondary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSavedPlaceholder = () => (
    <View style={styles.emptyState}>
      <Feather name="bookmark" size={48} color={lightColors.textSecondary} />
      <Text style={styles.emptyText}>No saved posts yet</Text>
      <Text style={styles.emptySubtext}>Your saved artworks will appear here</Text>
    </View>
  );

  const getRoleBadgeLabel = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'artist':
        return 'Artist';
      case 'art_lover':
      case 'artlover':
        return 'Art Lover';
      case 'collector':
        return 'Collector';
      default:
        return role || 'Member';
    }
  };

  if (isLoading && !displayUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={lightColors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <Feather name="settings" size={22} color={lightColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'posts' ? myPosts : savedPosts}
        keyExtractor={(item) => item._id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Profile Info */}
            <View style={styles.profileInfo}>
              {isGuest ? (
                <>
                  <View style={styles.avatarPlaceholder}>
                    <Feather name="user" size={36} color={lightColors.textSecondary} />
                  </View>
                  <Text style={styles.fullName}>Guest Explorer</Text>
                  <Text style={styles.username}>@{guestUsername || 'guest'}</Text>

                  {/* Role Badge */}
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Explorer</Text>
                  </View>

                  {/* Login Banner */}
                  <TouchableOpacity style={styles.loginBanner} onPress={() => dispatch(logout())} activeOpacity={0.7}>
                    <Feather name="log-in" size={16} color={lightColors.accent} />
                    <Text style={styles.loginBannerText}>Login to customize your profile</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {displayUser?.avatarUrl ? (
                    <Image
                      source={{ uri: displayUser.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Feather name="user" size={36} color={lightColors.textSecondary} />
                    </View>
                  )}
                  <Text style={styles.fullName}>
                    {displayUser?.fullName || 'User'}
                  </Text>
                  <View style={styles.usernameRow}>
                    <Text style={styles.username}>
                      @{displayUser?.username || 'username'}
                    </Text>
                    {(displayUser as any)?.isVerified && (
                      <Feather name="check-circle" size={16} color="#3B82F6" style={styles.verifiedBadge} />
                    )}
                  </View>

                  {/* Role Badge */}
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {getRoleBadgeLabel(displayUser?.role || '')}
                    </Text>
                  </View>

                  {/* Stats */}
                  <View style={styles.statsContainer}>
                    <TouchableOpacity style={styles.statBox} onPress={openFollowersList} activeOpacity={0.7}>
                      <Text style={styles.statNum}>
                        {displayUser?.stats?.followers ?? 0}
                      </Text>
                      <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={openFollowingList} activeOpacity={0.7}>
                      <Text style={styles.statNum}>
                        {displayUser?.stats?.following ?? 0}
                      </Text>
                      <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Metrics Row */}
                  <View style={styles.metricsContainer}>
                    <View style={styles.metricBox}>
                      <Feather name="grid" size={16} color={lightColors.accent} />
                      <Text style={styles.metricNum}>{metrics.totalPosts}</Text>
                      <Text style={styles.metricLabel}>Posts</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Feather name="heart" size={16} color="#FF3B30" />
                      <Text style={styles.metricNum}>{metrics.totalLikes}</Text>
                      <Text style={styles.metricLabel}>Likes Received</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Feather name="bookmark" size={16} color="#8B5CF6" />
                      <Text style={styles.metricNum}>{metrics.totalSaves}</Text>
                      <Text style={styles.metricLabel}>Saves Received</Text>
                    </View>
                  </View>

                  {/* Edit Profile Button */}
                  <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
                    <Text style={styles.editBtnText}>Edit Profile</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
                onPress={() => setActiveTab('posts')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'posts' && styles.activeTabText,
                  ]}
                >
                  My Posts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
                onPress={() => setActiveTab('saved')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'saved' && styles.activeTabText,
                  ]}
                >
                  Saved
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={renderPostThumbnail}
        ListEmptyComponent={
          activeTab === 'saved' ? renderSavedPlaceholder() : (
            <View style={styles.emptyState}>
              <Feather name="grid" size={48} color={lightColors.textSecondary} />
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>Your artwork will appear here</Text>
            </View>
          )
        }
      />

      {/* Followers/Following Modal */}
      <Modal
        visible={listModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setListModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{listModalTitle}</Text>
              <TouchableOpacity onPress={() => setListModalVisible(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={22} color={lightColors.textPrimary} />
              </TouchableOpacity>
            </View>
            {listModalLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={lightColors.accent} />
              </View>
            ) : listModalData.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Feather name="users" size={36} color={lightColors.textSecondary} />
                <Text style={styles.modalEmptyText}>No {listModalTitle.toLowerCase()} yet</Text>
              </View>
            ) : (
              <FlatList
                data={listModalData}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalUserItem}
                    onPress={() => handleListItemPress(item._id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalUserAvatar}>
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.modalUserAvatarImage} />
                      ) : (
                        <Feather name="user" size={16} color={lightColors.textSecondary} />
                      )}
                    </View>
                    <Text style={styles.modalUsername}>{item.username}</Text>
                    <Feather name="chevron-right" size={16} color={lightColors.textSecondary} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  settingsBtn: {
    padding: 4,
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: lightColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  fullName: {
    fontSize: 20,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  username: {
    fontSize: 14,
    color: lightColors.textSecondary,
    marginTop: 2,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  verifiedBadge: {
    marginLeft: 6,
  },
  roleBadge: {
    borderWidth: 1.5,
    borderColor: lightColors.accent,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 16,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: lightColors.accent,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 40,
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: lightColors.textSecondary,
    marginTop: 2,
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: lightColors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  metricBox: {
    alignItems: 'center',
    gap: 4,
  },
  metricNum: {
    fontSize: 16,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: lightColors.textSecondary,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: lightColors.border,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  editBtnText: {
    color: lightColors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: lightColors.textPrimary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: lightColors.textSecondary,
  },
  activeTabText: {
    color: lightColors.textPrimary,
    fontWeight: '600',
  },
  thumbnailContainer: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: lightColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: lightColors.textSecondary,
    marginTop: 4,
  },
  loginBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightColors.surface,
    borderWidth: 1,
    borderColor: lightColors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
    gap: 8,
  },
  loginBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: lightColors.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: lightColors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalLoadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  modalEmptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: lightColors.textSecondary,
    marginTop: 8,
  },
  modalUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  modalUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: lightColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  modalUserAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  modalUsername: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.textPrimary,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 3,
    left: 3,
    flexDirection: 'row',
    gap: 2,
  },
  aiBadgeSmall: {
    backgroundColor: '#6366F1',
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  nsfwBadgeSmall: {
    backgroundColor: '#DC2626',
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeTextSmall: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
});
