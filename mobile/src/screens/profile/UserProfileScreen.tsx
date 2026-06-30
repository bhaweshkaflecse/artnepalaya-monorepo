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
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppStack';
import { lightColors } from '../../theme/colors';
import { userService, User } from '../../services/user.service';
import { Post } from '../../services/post.service';
import { getPrimaryImageUrl } from '../../utils/media';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectIsGuest, selectUser, logout } from '../../store/slices/authSlice';

type UserProfileRouteProp = RouteProp<AppStackParamList, 'UserProfile'>;

export const UserProfileScreen = () => {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { userId } = route.params;
  const isGuest = useAppSelector(selectIsGuest);
  const currentUser = useAppSelector(selectUser);
  const dispatch = useAppDispatch();

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Followers/Following modal state
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listModalTitle, setListModalTitle] = useState<'Followers' | 'Following'>('Followers');
  const [listModalData, setListModalData] = useState<Array<{ _id: string; username: string; avatarUrl?: string }>>([]);
  const [listModalLoading, setListModalLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadPosts();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const data = await userService.getPublicProfile(userId);
      setProfile(data);
      setFollowersCount(data.stats?.followers ?? 0);
      setFollowingCount(data.stats?.following ?? 0);

      // Verify following count from actual data
      try {
        const followingResponse = await userService.getFollowing(userId, 1, 1);
        if (followingResponse.meta?.totalItems !== undefined) {
          setFollowingCount(followingResponse.meta.totalItems);
        }
      } catch (_e) { /* use stats count as fallback */ }

      // Hydrate follow state if user is authenticated
      if (!isGuest) {
        try {
          const status = await userService.getFollowStatus(userId);
          setIsFollowing(status.isFollowing);
        } catch (_e) {
          // Silently fail - default to not following
        }
      }
    } catch (error) {
      console.warn('[UserProfileScreen] Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await userService.getUserPosts(userId);
      setPosts(response.data);
    } catch (error) {
      console.warn('[UserProfileScreen] Failed to load posts:', error);
    }
  };

  const handleFollow = async () => {
    if (currentUser && userId === currentUser.id) return;
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Login to follow artists.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Login', onPress: () => { dispatch(logout()); } },
        ]
      );
      return;
    }
    try {
      if (isFollowing) {
        await userService.unfollowUser(userId);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await userService.followUser(userId);
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
      // Refresh actual count from server
      const freshProfile = await userService.getPublicProfile(userId);
      setFollowersCount(freshProfile.stats?.followers ?? followersCount);
      setFollowingCount(freshProfile.stats?.following ?? followingCount);
    } catch (error) {
      console.warn('[UserProfileScreen] Follow action failed:', error);
    }
  };

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

  const openFollowersList = useCallback(async () => {
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
  }, [userId]);

  const openFollowingList = useCallback(async () => {
    setListModalTitle('Following');
    setListModalData([]);
    setListModalLoading(true);
    setListModalVisible(true);
    try {
      const response = await userService.getFollowing(userId);
      setListModalData(response.data || []);
      setFollowingCount(response.data?.length ?? followingCount);
    } catch (_e) {
      // Silently fail
    } finally {
      setListModalLoading(false);
    }
  }, [userId]);

  const handleListItemPress = (itemUserId: string) => {
    setListModalVisible(false);
    if (currentUser && itemUserId === currentUser.id) {
      navigation.navigate('MainTabs' as any, { screen: 'Profile' } as any);
    } else {
      navigation.push('UserProfile', { userId: itemUserId });
    }
  };

  const renderPostThumbnail = ({ item }: { item: Post }) => {
    const imageUrl = getPrimaryImageUrl(item.media || []);
    return (
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={() => navigation.navigate('PostDetail', { postId: item._id })}
        activeOpacity={0.8}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.gridImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={20} color={lightColors.textSecondary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={lightColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {profile?.username || 'Profile'}
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.profileInfo}>
            {/* Avatar */}
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={36} color={lightColors.textSecondary} />
              </View>
            )}

            {/* Name */}
            <Text style={styles.fullName}>{profile?.fullName || 'User'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.username}>@{profile?.username || 'username'}</Text>
              {profile?.isVerified && <Feather name="check-circle" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />}
            </View>

            {/* Bio */}
            {profile?.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}

            {/* Location & Website */}
            {!!profile?.location && (
              <TouchableOpacity
                style={styles.contactInfoRow}
                activeOpacity={0.7}
                onLongPress={() => { Clipboard.setStringAsync(profile.location); Alert.alert('Copied', 'Location copied to clipboard'); }}
              >
                <Feather name="map-pin" size={14} color={lightColors.textSecondary} />
                <Text style={styles.contactInfoText}>{profile.location}</Text>
              </TouchableOpacity>
            )}
            {!!profile?.website && (
              <TouchableOpacity
                style={styles.contactInfoRow}
                activeOpacity={0.7}
                onLongPress={() => { Clipboard.setStringAsync(profile.website); Alert.alert('Copied', 'Website copied to clipboard'); }}
              >
                <Feather name="globe" size={14} color={lightColors.textSecondary} />
                <Text style={styles.contactInfoText}>{profile.website}</Text>
              </TouchableOpacity>
            )}
            {!!(profile as any)?.whatsapp && (
              <TouchableOpacity
                style={styles.contactInfoRow}
                activeOpacity={0.7}
                onLongPress={() => { Clipboard.setStringAsync((profile as any).whatsapp); Alert.alert('Copied', 'WhatsApp copied to clipboard'); }}
              >
                <Feather name="message-circle" size={14} color={lightColors.textSecondary} />
                <Text style={styles.contactInfoText}>{(profile as any).whatsapp}</Text>
              </TouchableOpacity>
            )}
            {!!(profile as any)?.contactPhone && (
              <TouchableOpacity
                style={styles.contactInfoRow}
                activeOpacity={0.7}
                onLongPress={() => { Clipboard.setStringAsync((profile as any).contactPhone); Alert.alert('Copied', 'Phone copied to clipboard'); }}
              >
                <Feather name="phone" size={14} color={lightColors.textSecondary} />
                <Text style={styles.contactInfoText}>{(profile as any).contactPhone}</Text>
              </TouchableOpacity>
            )}

            {/* Role Badge */}
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {getRoleBadgeLabel(profile?.role || '')}
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statBox} onPress={openFollowersList} activeOpacity={0.7}>
                <Text style={styles.statNum}>{followersCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statBox} onPress={openFollowingList} activeOpacity={0.7}>
                <Text style={styles.statNum}>
                  {followingCount}
                </Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>

            {/* Follow/Unfollow Button */}
            {!(currentUser && userId === currentUser.id) && (
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={handleFollow}
                activeOpacity={0.7}
              >
                <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Posts section divider */}
            <View style={styles.postsDivider}>
              <Text style={styles.postsDividerText}>Posts</Text>
              <View style={styles.postsDividerLine} />
            </View>
          </View>
        }
        renderItem={renderPostThumbnail}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="grid" size={48} color={lightColors.textSecondary} />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
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
                <Text style={styles.modalEmptyText}>
                  {((listModalTitle === 'Followers' && followersCount > 0) ||
                    (listModalTitle === 'Following' && (profile?.stats?.following ?? 0) > 0))
                    ? 'Followers from before you joined'
                    : `No ${listModalTitle.toLowerCase()} yet`}
                </Text>
                {((listModalTitle === 'Followers' && followersCount > 0) ||
                  (listModalTitle === 'Following' && (profile?.stats?.following ?? 0) > 0)) && (
                  <Text style={styles.modalEmptySubtext}>
                    Counts are seeded placeholders until real follows occur
                  </Text>
                )}
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
    fontSize: 18,
    fontWeight: '700',
    color: lightColors.textPrimary,
  },
  backBtn: {
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
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: lightColors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  contactInfoText: {
    fontSize: 13,
    color: lightColors.textSecondary,
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
  followBtn: {
    backgroundColor: lightColors.accent,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  followBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  followingBtnText: {
    color: lightColors.textPrimary,
  },
  postsDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  postsDividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginRight: 12,
  },
  postsDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: lightColors.border,
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
  modalEmptySubtext: {
    fontSize: 12,
    color: lightColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
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
});
