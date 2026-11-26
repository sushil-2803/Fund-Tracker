import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExpensesListScreen from '../screens/expenses/ExpensesListScreen';
import ExpenseDetailScreen from '../screens/expenses/ExpenseDetailScreen';

const Stack = createNativeStackNavigator();

export default function ExpensesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ExpensesList" component={ExpensesListScreen} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
    </Stack.Navigator>
  );
}
