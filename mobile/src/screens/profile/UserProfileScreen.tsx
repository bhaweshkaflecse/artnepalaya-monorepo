import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppStack';
import { lightColors } from '../../theme/colors';
import { userService, User } from '../../services/user.service';
import { Post } from '../../services/post.service';
import { getPrimaryImageUrl } from '../../utils/media';

type UserProfileRouteProp = RouteProp<AppStackParamList, 'UserProfile'>;

export const UserProfileScreen = () => {
  const route = useRoute<UserProfileRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    loadProfile();
    loadPosts();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const data = await userService.getPublicProfile(userId);
      setProfile(data);
      setFollowersCount(data.stats?.followers ?? 0);
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
            <Text style={styles.username}>@{profile?.username || 'username'}</Text>

            {/* Bio */}
            {profile?.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}

            {/* Role Badge */}
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {getRoleBadgeLabel(profile?.role || '')}
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{followersCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>
                  {profile?.stats?.following ?? 0}
                </Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            {/* Follow/Unfollow Button */}
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleFollow}
              activeOpacity={0.7}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

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
});
