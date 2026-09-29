import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme/theme';
import CurrencyText from './CurrencyText';

export default function MetricCard({
  title,
  amount,
  subtitle,
  accentColor = COLORS.primary,
  icon,
  onPress,
  style,
  amountSize = 20,
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.card,
        { borderLeftColor: accentColor },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: `${accentColor}1A` }]}>
            <Text style={[styles.iconText, { color: accentColor }]}>{icon}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.amountWrap}>
        <CurrencyText
          amount={amount}
          color={COLORS.textPrimary}
          size={amountSize}
          bold
        />
      </View>

      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    padding: SPACING.md,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  iconText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  amountWrap: {
    marginVertical: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
});
