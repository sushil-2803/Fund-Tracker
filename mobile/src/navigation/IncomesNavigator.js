import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IncomesListScreen from '../screens/incomes/IncomesListScreen';
import IncomeDetailScreen from '../screens/incomes/IncomeDetailScreen';

const Stack = createNativeStackNavigator();

export default function IncomesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="IncomesList" component={IncomesListScreen} />
      <Stack.Screen name="IncomeDetail" component={IncomeDetailScreen} />
    </Stack.Navigator>
  );
}
