import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  PieChart,
} from 'lucide-react-native';
import { COLORS, RADIUS, SPACING } from '../theme/theme';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import IncomesNavigator from './IncomesNavigator';
import ExpensesNavigator from './ExpensesNavigator';
import AllocationsListScreen from '../screens/allocations/AllocationsListScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';

const Tab = createBottomTabNavigator();

function TabBarIcon({ focused, label, IconComponent, activeColor }) {
  return (
    <View style={styles.tabItemContainer}>
      <View
        style={[
          styles.tabIconBadge,
          focused && { backgroundColor: `${activeColor}22` },
        ]}
      >
        <IconComponent
          size={18}
          color={focused ? activeColor : COLORS.textSubtle}
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>
      <Text
        style={[
          styles.tabLabelText,
          { color: focused ? activeColor : COLORS.textMuted },
          focused && styles.tabLabelTextActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : SPACING.sm,
          paddingTop: SPACING.xs,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              label="Overview"
              IconComponent={LayoutDashboard}
              activeColor={COLORS.primary}
            />
          ),
        }}
      />
      <Tab.Screen
        name="IncomesStack"
        component={IncomesNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              label="Incomes"
              IconComponent={TrendingUp}
              activeColor={COLORS.success}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ExpensesStack"
        component={ExpensesNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              label="Expenses"
              IconComponent={TrendingDown}
              activeColor={COLORS.danger}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Allocations"
        component={AllocationsListScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              label="Allocate"
              IconComponent={ArrowLeftRight}
              activeColor={COLORS.accent}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              label="Analytics"
              IconComponent={PieChart}
              activeColor={COLORS.primary}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabIconBadge: {
    width: 34,
    height: 26,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabelText: {
    fontSize: 10,
    fontWeight: '500',
  },
  tabLabelTextActive: {
    fontWeight: '700',
  },
});
