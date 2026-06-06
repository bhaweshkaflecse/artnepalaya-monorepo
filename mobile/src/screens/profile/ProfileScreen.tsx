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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppStack';
import { lightColors } from '../../theme/colors';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchProfile, fetchMyPosts } from '../../store/slices/userSlice';

export const ProfileScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const authUser = useAppSelector((state) => state.auth.user);
  const { profile, myPosts, isLoading } = useAppSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    const userId = profile?._id || authUser?.id;
    if (userId) {
      dispatch(fetchMyPosts(userId));
    }
  }, [dispatch, profile, authUser]);

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
    const imageUrl = item.media?.[0]?.url;
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
        data={activeTab === 'posts' ? myPosts : []}
        keyExtractor={(item) => item._id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Profile Info */}
            <View style={styles.profileInfo}>
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
              <Text style={styles.username}>
                @{displayUser?.username || 'username'}
              </Text>

              {/* Role Badge */}
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {getRoleBadgeLabel(displayUser?.role || '')}
                </Text>
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>
                    {displayUser?.stats?.followers ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>
                    {displayUser?.stats?.following ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>

              {/* Edit Profile Button */}
              <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
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
    marginBottom: 10,
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
});
