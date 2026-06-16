import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { darkColors } from '../../theme/colors';
import { postService, Post } from '../../services/post.service';
import { api } from '../../services/api';
import { useAppDispatch } from '../../store';
import { fetchFeed } from '../../store/slices/feedSlice';

const FALLBACK_TYPES = ['Painting', 'Digital Art', 'Photography', 'Sculpture', 'Mixed Media', 'Illustration', 'Thangka'];

type EditPostRouteProp = RouteProp<{ EditPost: { postId: string; post: Post } }, 'EditPost'>;

export const EditPostScreen = () => {
  const route = useRoute<EditPostRouteProp>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { postId, post } = route.params;

  const [caption, setCaption] = useState(post.caption || '');
  const [tagsInput, setTagsInput] = useState((post.tags || []).join(', '));
  const [isHumanMade, setIsHumanMade] = useState(post.isHumanMade ?? true);
  const [isNsfw, setIsNsfw] = useState((post as any).isNsfw ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [artworkTypes, setArtworkTypes] = useState<string[]>(FALLBACK_TYPES);
  const [selectedTypes, setSelectedTypes] = useState<string[]>((post as any).artworkType || []);

  useEffect(() => {
    api.get('/config/artwork-types')
      .then((res) => {
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setArtworkTypes(res.data.data.map((t: any) => t.name || t));
        }
      })
      .catch(() => {
        // Use fallback types on error
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await postService.updatePost(postId, {
        caption,
        tags: tagsArray,
        artworkType: selectedTypes,
        isHumanMade,
        isNsfw,
      });

      Alert.alert('Success', 'Post updated successfully');
      dispatch(fetchFeed());
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Artwork</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.headerBtn}>
          {isSaving ? (
            <ActivityIndicator size="small" color={darkColors.accent} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Caption */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={styles.textAreaInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption..."
            placeholderTextColor={darkColors.textSecondary}
            multiline
            maxLength={2200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{caption.length}/2200</Text>
        </View>

        {/* Tags */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Tags</Text>
          <TextInput
            style={styles.textInput}
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder="art, digital, nepal (comma-separated)"
            placeholderTextColor={darkColors.textSecondary}
          />
        </View>

        {/* Artwork Type */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Artwork Type</Text>
          <View style={styles.chipContainer}>
            {artworkTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, selectedTypes.includes(type) && styles.chipActive]}
                onPress={() => setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
              >
                <Text style={[styles.chipText, selectedTypes.includes(type) && styles.chipTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Human Made Toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          activeOpacity={0.7}
          onPress={() => setIsHumanMade(!isHumanMade)}
        >
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Human-made artwork</Text>
            <Text style={styles.toggleDescription}>This artwork was created by a human</Text>
          </View>
          <View style={[styles.checkbox, isHumanMade && styles.checkboxActive]}>
            {isHumanMade && <Feather name="check" size={14} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        {/* NSFW Toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          activeOpacity={0.7}
          onPress={() => setIsNsfw(!isNsfw)}
        >
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Mature content (NSFW)</Text>
            <Text style={styles.toggleDescription}>This artwork contains mature or sensitive content</Text>
          </View>
          <View style={[styles.checkbox, isNsfw && styles.checkboxActive]}>
            {isNsfw && <Feather name="check" size={14} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>
      </ScrollView>
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
  headerBtn: {
    padding: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkColors.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: darkColors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  textAreaInput: {
    backgroundColor: darkColors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: darkColors.border,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: darkColors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkColors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  toggleDescription: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: darkColors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: darkColors.accent,
    borderColor: darkColors.accent,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkColors.border,
    backgroundColor: darkColors.surface,
  },
  chipActive: {
    borderColor: darkColors.accent,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
  },
  chipText: {
    fontSize: 13,
    color: darkColors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: darkColors.accent,
    fontWeight: '600',
  },
});
