import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import { pct, progressColor } from '../../utils/formatters';

export default function ProgressBar({
  used,
  total,
  percentage,
  height = 6,
  showLabel = false,
  labelPrefix = '',
  style,
}) {
  const fillPct = percentage !== undefined ? percentage : pct(used, total);
  const color = progressColor(fillPct);

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.labelText}>
            {labelPrefix ? `${labelPrefix}: ` : ''}
            {Math.round(fillPct)}%
          </Text>
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(Math.max(fillPct, 0), 100)}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  labelText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  track: {
    width: '100%',
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fill: {
    borderRadius: RADIUS.full,
  },
});
