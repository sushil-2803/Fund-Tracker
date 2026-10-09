import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme/theme';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [fadeAnim, slideAnim]);

  const showToast = useCallback(
    (message, type = 'info', duration = 3500) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setToast({ message, type });

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [fadeAnim, slideAnim, hideToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hideToast}
            style={[
              styles.toastCard,
              toast.type === 'success' && styles.successCard,
              toast.type === 'error' && styles.errorCard,
              toast.type === 'info' && styles.infoCard,
            ]}
          >
            <View
              style={[
                styles.indicator,
                toast.type === 'success' && styles.successIndicator,
                toast.type === 'error' && styles.errorIndicator,
                toast.type === 'info' && styles.infoIndicator,
              ]}
            />
            <Text style={styles.messageText}>{toast.message}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '100%',
    width: '100%',
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
