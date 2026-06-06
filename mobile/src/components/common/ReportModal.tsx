import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { darkColors } from '../../theme/colors';
import { postService } from '../../services/post.service';

const REPORT_REASONS = [
  'Nudity',
  'Fake/Misleading',
  'Unmarked AI Content',
  'Illegal Items',
  'Spam',
  'Harassment',
  'Copyright Violation',
  'Other',
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  onReported?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  postId,
  onReported,
}) => {
  const handleReport = async (reason: string) => {
    onClose();
    try {
      await postService.reportPost(postId, reason);
      Alert.alert('Report Submitted', 'Thank you for helping keep the community safe.');
      onReported?.();
    } catch (_e) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Report Post</Text>
          <Text style={styles.modalSubtitle}>Why are you reporting this?</Text>
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={styles.reportOption}
              onPress={() => handleReport(reason)}
            >
              <Text style={styles.reportOptionText}>{reason}</Text>
              <Feather name="chevron-right" size={18} color={darkColors.textSecondary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: darkColors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: darkColors.textSecondary,
    marginBottom: 16,
  },
  reportOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  reportOptionText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  cancelBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: darkColors.accent,
  },
});
