import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { lightColors } from '../../theme/colors';
import { api } from '../../services/api';
import { useAppSelector } from '../../store';
import { selectIsGuest } from '../../store/slices/authSlice';

const MAX_IMAGES = 5;
const MAX_VIDEOS = 1;

const ARTWORK_TYPES = [
  'Painting',
  'Digital Art',
  'Photography',
  'Sculpture',
  'Mixed Media',
  'Other',
];

export const CreateScreen = () => {
  const navigation = useNavigation();
  const isGuest = useAppSelector(selectIsGuest);
  const [mediaItems, setMediaItems] = useState<Array<{ uri: string; type: 'image' | 'video'; fileSize?: number }>>([]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [artworkType, setArtworkType] = useState<string>('');
  const [isHumanMade, setIsHumanMade] = useState(false);
  const [isNsfw, setIsNsfw] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const pickImage = async () => {
    const currentImages = mediaItems.filter((m) => m.type === 'image').length;
    if (currentImages >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_IMAGES} images per post.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';

        if (isVideo) {
          const currentVideos = mediaItems.filter((m) => m.type === 'video').length;
          if (currentVideos >= MAX_VIDEOS) {
            Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_VIDEOS} video per post.`);
            return;
          }
        } else {
          if (currentImages >= MAX_IMAGES) {
            Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_IMAGES} images per post.`);
            return;
          }
        }

        // Check file size if available (10MB limit for images)
        if (!isVideo && asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image under 10MB.');
          return;
        }

        setMediaItems((prev) => [
          ...prev,
          { uri: asset.uri, type: isVideo ? 'video' : 'image', fileSize: asset.fileSize || undefined },
        ]);
      }
    } catch (_e) {
      // Image picker not available - this is expected if expo-image-picker
      // is not in package.json dependencies
    }
  };

  const resetForm = () => {
    setMediaItems([]);
    setDescription('');
    setTags('');
    setArtworkType('');
    setIsHumanMade(false);
    setIsNsfw(false);
  };

  const handlePublish = async () => {
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Guest users cannot publish artwork. Please login to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => (navigation as any).navigate('Auth') },
        ]
      );
      return;
    }

    if (mediaItems.length === 0) {
      Alert.alert('Error', 'Please select an artwork to upload.');
      return;
    }

    const imageCount = mediaItems.filter((m) => m.type === 'image').length;
    const videoCount = mediaItems.filter((m) => m.type === 'video').length;

    if (imageCount > MAX_IMAGES) {
      Alert.alert('Limit Exceeded', `Maximum ${MAX_IMAGES} images allowed per post.`);
      return;
    }
    if (videoCount > MAX_VIDEOS) {
      Alert.alert('Limit Exceeded', `Maximum ${MAX_VIDEOS} video allowed per post.`);
      return;
    }

    if (!isHumanMade) {
      Alert.alert(
        'Declaration Required',
        'You must confirm that this artwork contains no AI generation.'
      );
      return;
    }

    setIsPublishing(true);

    try {
      const formData = new FormData();

      // Append all media files
      for (const item of mediaItems) {
        const filename = item.uri.split('/').pop() || (item.type === 'video' ? 'video.mp4' : 'artwork.jpg');
        const match = /\.(\w+)$/.exec(filename);
        const type = item.type === 'video'
          ? (match ? `video/${match[1]}` : 'video/mp4')
          : (match ? `image/${match[1]}` : 'image/jpeg');

        // File size guard for images
        if (item.type === 'image' && item.fileSize && item.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select images under 10MB.');
          setIsPublishing(false);
          return;
        }

        const mediaAsset = {
          uri: item.uri,
          name: filename,
          type,
        };

        formData.append('media', mediaAsset as any);
      }

      if (description) {
        formData.append('caption', description);
      }

      if (tags) {
        const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
        tagsArray.forEach((tag) => {
          formData.append('tags[]', tag);
        });
      }

      if (artworkType) {
        formData.append('artworkType', artworkType);
      }

      formData.append('isHumanMade', 'true');

      if (isNsfw) {
        formData.append('isNsfw', 'true');
      }

      await api.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Artwork published successfully!');
      resetForm();
    } catch (_e) {
      Alert.alert('Error', 'Failed to publish artwork. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const canPublish = isHumanMade && mediaItems.length > 0 && !isPublishing;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={!canPublish}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color={lightColors.accent} />
          ) : (
            <Text style={[styles.publishBtn, !canPublish && styles.disabledText]}>
              Publish
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Guest Info Card */}
        {isGuest && (
          <View style={styles.guestInfoCard}>
            <Feather name="info" size={20} color="#2563EB" style={styles.guestInfoIcon} />
            <View style={styles.guestInfoContent}>
              <Text style={styles.guestInfoText}>
                Create and showcase your artwork to the ArtNepalaya community.
              </Text>
              <Text style={styles.guestInfoSubtext}>
                Login or create an account to publish artwork.
              </Text>
            </View>
          </View>
        )}

        {/* Media Picker */}
        <TouchableOpacity style={styles.mediaContainer} onPress={pickImage}>
          {mediaItems.length > 0 ? (
            <Image source={{ uri: mediaItems[0].uri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <Feather name="image" size={32} color={lightColors.textSecondary} />
              <Text style={styles.placeholderText}>Tap to select artwork</Text>
              <Text style={styles.placeholderSubtext}>JPG, PNG up to 10MB (max {MAX_IMAGES} images, {MAX_VIDEOS} video)</Text>
            </View>
          )}
        </TouchableOpacity>
        {mediaItems.length > 0 && (
          <Text style={styles.mediaCount}>
            {mediaItems.filter((m) => m.type === 'image').length}/{MAX_IMAGES} images, {mediaItems.filter((m) => m.type === 'video').length}/{MAX_VIDEOS} video selected
          </Text>
        )}

        {/* Description */}
        <TextInput
          style={styles.input}
          placeholder="Write a description..."
          placeholderTextColor={lightColors.textSecondary}
          multiline
          maxLength={2000}
          value={description}
          onChangeText={setDescription}
        />

        {/* Tags */}
        <TextInput
          style={styles.input}
          placeholder="Add tags (comma separated)"
          placeholderTextColor={lightColors.textSecondary}
          value={tags}
          onChangeText={setTags}
        />

        {/* Artwork Type Selector */}
        <Text style={styles.sectionLabel}>Artwork Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {ARTWORK_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.chip,
                artworkType === type && styles.chipActive,
              ]}
              onPress={() =>
                setArtworkType(artworkType === type ? '' : type)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  artworkType === type && styles.chipTextActive,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* AI Declaration */}
        <View style={styles.aiDeclarationContainer}>
          <TouchableOpacity
            onPress={() => setIsHumanMade(!isHumanMade)}
            style={styles.checkbox}
          >
            <Ionicons
              name={isHumanMade ? 'checkbox' : 'square-outline'}
              size={26}
              color={isHumanMade ? lightColors.accent : lightColors.textSecondary}
            />
          </TouchableOpacity>
          <Text style={styles.declarationText}>
            I declare that this artwork is 100% human-created. I understand that
            AI-generated content is strictly prohibited on Artnepalaya and violates
            the Terms of Service.
          </Text>
        </View>

        {/* NSFW Toggle */}
        <View style={styles.nsfwContainer}>
          <TouchableOpacity
            onPress={() => setIsNsfw(!isNsfw)}
            style={styles.checkbox}
          >
            <Ionicons
              name={isNsfw ? 'checkbox' : 'square-outline'}
              size={26}
              color={isNsfw ? lightColors.accent : lightColors.textSecondary}
            />
          </TouchableOpacity>
          <Text style={styles.nsfwText}>
            18+ / Sensitive Content - This artwork contains mature or sensitive
            content that may not be suitable for all audiences.
          </Text>
        </View>

        {/* Guest Warning Card */}
        {isGuest && (
          <View style={styles.guestWarningCard}>
            <Feather name="alert-circle" size={18} color="#DC2626" style={styles.guestWarningIcon} />
            <Text style={styles.guestWarningText}>
              Guest users cannot publish artwork. Please login to continue.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: lightColors.textPrimary,
  },
  publishBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: lightColors.accent,
  },
  disabledText: {
    color: '#CCC',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: lightColors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: lightColors.border,
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: lightColors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  placeholderSubtext: {
    marginTop: 4,
    color: lightColors.textSecondary,
    fontSize: 12,
  },
  mediaCount: {
    fontSize: 12,
    color: lightColors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: lightColors.border,
    paddingVertical: 12,
    fontSize: 16,
    color: lightColors.textPrimary,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: lightColors.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: lightColors.border,
    backgroundColor: lightColors.surface,
  },
  chipActive: {
    borderColor: lightColors.accent,
    backgroundColor: '#FFF0EF',
  },
  chipText: {
    fontSize: 13,
    color: lightColors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: lightColors.accent,
    fontWeight: '600',
  },
  aiDeclarationContainer: {
    flexDirection: 'row',
    backgroundColor: lightColors.surface,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  declarationText: {
    flex: 1,
    fontSize: 13,
    color: lightColors.textPrimary,
    lineHeight: 20,
  },
  nsfwContainer: {
    flexDirection: 'row',
    backgroundColor: lightColors.surface,
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  nsfwText: {
    flex: 1,
    fontSize: 13,
    color: lightColors.textPrimary,
    lineHeight: 20,
  },
  guestInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  guestInfoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  guestInfoContent: {
    flex: 1,
  },
  guestInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 20,
  },
  guestInfoSubtext: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 4,
    lineHeight: 18,
  },
  guestWarningCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  guestWarningIcon: {
    marginRight: 10,
  },
  guestWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    lineHeight: 18,
  },
});
