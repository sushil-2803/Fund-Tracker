import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusBadgeConfig, statusLabel } from '../../utils/formatters';
import { RADIUS, SPACING } from '../../theme/theme';

export default function StatusBadge({ status, size = 'md', style }) {
  const config = statusBadgeConfig(status);
  const label = statusLabel(status);

  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 6 : 9,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: isSm ? 11 : 12,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: RADIUS.full,
    marginRight: SPACING.xs,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
