import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/theme';

import LoginScreen from '../screens/auth/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import TagsScreen from '../screens/tags/TagsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  // Splash Screen while checking stored refresh token & session
  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoSymbol}>₹</Text>
        </View>
        <Text style={styles.splashTitle}>FundTracker</Text>
        <ActivityIndicator size="small" color={COLORS.primary} style={styles.spinner} />
        <Text style={styles.splashSubtitle}>Restoring session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Group
              screenOptions={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="TagsScreen" component={TagsScreen} />
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoSymbol: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  splashTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  spinner: {
    marginTop: 20,
    marginBottom: 8,
  },
  splashSubtitle: {
    color: COLORS.textSubtle,
    fontSize: 12,
  },
});
