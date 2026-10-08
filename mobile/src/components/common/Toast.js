import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';

export default function Toast({ message, type = 'info' }) {
  if (!message) return null;

  return (
    <View
      style={[
        styles.toastCard,
        type === 'success' && styles.successCard,
        type === 'error' && styles.errorCard,
        type === 'info' && styles.infoCard,
      ]}
    >
      <View
        style={[
          styles.indicator,
          type === 'success' && styles.successIndicator,
          type === 'error' && styles.errorIndicator,
          type === 'info' && styles.infoIndicator,
        ]}
      />
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    marginRight: SPACING.md,
  },
  successCard: {
    borderColor: COLORS.successDim,
  },
  successIndicator: {
    backgroundColor: COLORS.success,
  },
  errorCard: {
    borderColor: COLORS.dangerDim,
  },
  errorIndicator: {
    backgroundColor: COLORS.danger,
  },
  infoCard: {
    borderColor: COLORS.primaryDim,
  },
  infoIndicator: {
    backgroundColor: COLORS.primary,
  },
  messageText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
