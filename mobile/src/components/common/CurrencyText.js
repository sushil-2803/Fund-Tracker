import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { fmt } from '../../utils/formatters';
import { COLORS } from '../../theme/theme';

export default function CurrencyText({
  amount,
  style,
  color = COLORS.textPrimary,
  size = 15,
  bold = false,
  sign = '',
}) {
  const formatted = fmt(amount);
  const displayText = sign ? `${sign} ${formatted}` : formatted;

  return (
    <Text
      style={[
        styles.text,
        {
          color,
          fontSize: size,
          fontWeight: bold ? '700' : '500',
        },
        style,
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {displayText}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: -0.3,
  },
});
