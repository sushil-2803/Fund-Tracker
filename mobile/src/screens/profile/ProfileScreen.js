import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { fmtDate } from '../../utils/formatters';
import Header from '../../components/common/Header';
import ConfirmModal from '../../components/common/ConfirmModal';
import { setApiBaseUrl, getApiBaseUrl } from '../../api';
import { useToast } from '../../context/ToastContext';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl());

  const handleSignOut = async () => {
    try {
      setShowLogoutConfirm(false);
      await logout();
      showToast('Logged out successfully', 'info');
    } catch (err) {
      showToast('Error during logout', 'error');
    }
  };

  const handleSaveServerUrl = () => {
    if (serverUrlInput.trim()) {
      setApiBaseUrl(serverUrlInput.trim());
      showToast('API Host updated', 'success');
      setShowConfigModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Account Profile"
        subtitle="User profile & app settings"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrap}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(user?.name || user?.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.userName}>{user?.name || 'FundTracker User'}</Text>
          <Text style={styles.userEmail}>{user?.email || '—'}</Text>

          <View style={styles.authBadge}>
            <Text style={styles.authBadgeIcon}>G</Text>
            <Text style={styles.authBadgeText}>Authenticated via Google</Text>
          </View>
        </View>

        {/* Account Metadata */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Account Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>#{user?.id || '1'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {user?.created_at ? fmtDate(user.created_at) : 'Active Session'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Token Lifetime</Text>
            <Text style={styles.infoValue}>15m Access / 30d Refresh</Text>
          </View>
        </View>

        {/* Server Host Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.serverHeaderRow}>
            <Text style={styles.sectionHeading}>Backend Connection</Text>
            <TouchableOpacity
              onPress={() => {
                setServerUrlInput(getApiBaseUrl());
                setShowConfigModal(true);
              }}
            >
              <Text style={styles.editConfigLink}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API Base URL</Text>
            <Text style={styles.infoValueMono} numberOfLines={1}>
              {getApiBaseUrl()}
            </Text>
          </View>
        </View>

        {/* Tags Browser Shortcut */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.actionNavCard}
          onPress={() => navigation.navigate('TagsScreen')}
        >
          <View style={styles.actionNavLeft}>
            <Text style={styles.actionNavIcon}>🏷️</Text>
            <View>
              <Text style={styles.actionNavTitle}>Browse All Tags</Text>
              <Text style={styles.actionNavSubtitle}>
                Filter all transactions by categories and tags
              </Text>
            </View>
          </View>
          <Text style={styles.actionNavArrow}>→</Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.signOutBtn}
          onPress={() => setShowLogoutConfirm(true)}
        >
          <Text style={styles.signOutText}>Sign Out of FundTracker</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Confirm Modal */}
      <ConfirmModal
        visible={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to log in again to access your funds."
        confirmText="Sign Out"
        isDestructive
        onConfirm={handleSignOut}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* API Config Modal */}
      <Modal
        visible={showConfigModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              paddingTop: insets.top + SPACING.xl,
              paddingBottom: insets.bottom + SPACING.xl,
            },
          ]}
        >
          <View style={styles.configModal}>
            <Text style={styles.configModalTitle}>Configure API Host</Text>
            <Text style={styles.configModalDesc}>
              Update the API endpoint for your local network or server:
            </Text>

            <TextInput
              style={styles.configInput}
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              placeholder="e.g. http://localhost:3001/api or http://192.168.1.57:3001/api"
              placeholderTextColor={COLORS.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.configBtnRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalCancelBtn]}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalSaveBtn]}
                onPress={handleSaveServerUrl}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: SPACING.lg,
  },
  userCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: SPACING.md,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: COLORS.primaryLight,
    fontSize: 32,
    fontWeight: '700',
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  authBadgeIcon: {
    color: '#4285F4',
    fontWeight: '900',
    fontSize: 13,
    marginRight: 6,
  },
  authBadgeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  serverHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  editConfigLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    color: COLORS.textSubtle,
    fontSize: 13,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  infoValueMono: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontFamily: 'monospace',
    maxWidth: '60%',
  },
  actionNavCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionNavIcon: {
    fontSize: 22,
    marginRight: SPACING.md,
  },
  actionNavTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionNavSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  actionNavArrow: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: 'bold',
  },
  signOutBtn: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerDim,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  configModal: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 360,
  },
  configModalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  configModalDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  configInput: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 13,
    marginBottom: SPACING.lg,
  },
  configBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
  },
  modalActionBtn: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    minWidth: 80,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: COLORS.primary,
  },
  modalSaveText: {
    color: '#0d0f14',
    fontWeight: '700',
  },
});
