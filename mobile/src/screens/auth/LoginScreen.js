import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { setApiBaseUrl, getApiBaseUrl } from '../../api';
import { useToast } from '../../context/ToastContext';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, isAuthenticating, authError, signInWithDemo } = useAuth();
  const { showToast } = useToast();

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl());

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      // Handled in context / toast
    }
  };

  const handleSaveServerUrl = () => {
    if (serverUrlInput.trim()) {
      setApiBaseUrl(serverUrlInput.trim());
      showToast('API Base URL updated', 'success');
      setShowConfigModal(false);
    }
  };

  // Demo sign-in for testing/development connected to backend database
  const handleDemoSignIn = async () => {
    try {
      await signInWithDemo('demo@fundtracker.app');
      showToast('Signed in as Demo User', 'success');
    } catch (err) {
      showToast(err.message || 'Demo login failed', 'error');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar settings button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.configBtn}
            onPress={() => {
              setServerUrlInput(getApiBaseUrl());
              setShowConfigModal(true);
            }}
          >
            <Text style={styles.configBtnText}>⚙ API Config</Text>
          </TouchableOpacity>
        </View>

        {/* Brand Hero */}
        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoSymbol}>₹</Text>
          </View>
          <Text style={styles.appName}>FundTracker</Text>
          <Text style={styles.appTagline}>
            Track incomes, link expenses, and master your financial allocations in real time.
          </Text>
        </View>

        {/* Feature Badges */}
        <View style={styles.featuresCard}>
          <View style={styles.featureRow}>
            <View style={[styles.featureDot, { backgroundColor: COLORS.success }]} />
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Fund Inflow Tracking</Text>
              <Text style={styles.featureDesc}>Log multi-source incomes and monitor remaining limits.</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureDot, { backgroundColor: COLORS.accent }]} />
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Smart Fund Linking</Text>
              <Text style={styles.featureDesc}>Directly settle expenses against available income balances.</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureDot, { backgroundColor: COLORS.primary }]} />
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Live Financial Analytics</Text>
              <Text style={styles.featureDesc}>Visual breakdowns of settlement rates, categories, and trends.</Text>
            </View>
          </View>
        </View>

        {authError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator size="small" color="#0d0f14" />
            ) : (
              <View style={styles.btnInner}>
                <View style={styles.gLogoBadge}>
                  <Text style={styles.gLetter}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.demoBtn}
            onPress={handleDemoSignIn}
            disabled={isAuthenticating}
          >
            <Text style={styles.demoBtnText}>Explore Demo Mode</Text>
          </TouchableOpacity>

          <Text style={styles.privacyNote}>
            Secure JWT Authentication with auto-renewing tokens.
          </Text>
        </View>
      </ScrollView>

      {/* Server API Config Modal */}
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
            <Text style={styles.configModalTitle}>Backend API Settings</Text>
            <Text style={styles.configModalDesc}>
              Configure the API Base URL for your local network or backend server:
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
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: SPACING.sm,
  },
  configBtn: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  configBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoSymbol: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  appTagline: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  featuresCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: SPACING.sm,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    marginTop: 6,
    marginRight: SPACING.md,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    color: COLORS.textSubtle,
    fontSize: 12,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerDim,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  actionSection: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  googleBtn: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gLogoBadge: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  gLetter: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 13,
  },
  googleBtnText: {
    color: '#1a1e28',
    fontSize: 15,
    fontWeight: '700',
  },
  demoBtn: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBtnText: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  privacyNote: {
    color: COLORS.textSubtle,
    fontSize: 11,
    textAlign: 'center',
    marginTop: SPACING.xs,
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
