import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/finance/DashboardScreen';
import ApartmentsScreen from '../screens/finance/ApartmentsScreen';
import PaymentsScreen from '../screens/finance/PaymentsScreen';
import ExpensesScreen from '../screens/finance/ExpensesScreen';
import ServiceRequestsScreen from '../screens/services/ServiceRequestsScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import ControlScreen from '../screens/control/ControlScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const headerOpts = {
  headerStyle: { backgroundColor: '#1F2937' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '600' as const },
};

const FinanceStack = () => (
  <Stack.Navigator screenOptions={headerOpts}>
    <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
    <Stack.Screen name="Apartments" component={ApartmentsScreen} />
    <Stack.Screen name="Payments" component={PaymentsScreen} />
    <Stack.Screen name="Expenses" component={ExpensesScreen} />
  </Stack.Navigator>
);

const ServicesStack = () => (
  <Stack.Navigator screenOptions={headerOpts}>
    <Stack.Screen name="Services" component={ServiceRequestsScreen} options={{ title: 'Service Requests' }} />
  </Stack.Navigator>
);

const ReportsStack = () => (
  <Stack.Navigator screenOptions={headerOpts}>
    <Stack.Screen name="Reports" component={ReportsScreen} />
  </Stack.Navigator>
);

const ControlStack = () => (
  <Stack.Navigator screenOptions={headerOpts}>
    <Stack.Screen name="Control" component={ControlScreen} />
  </Stack.Navigator>
);

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const AppTabs = () => (
  <Tab.Navigator screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: '#10B981',
    tabBarInactiveTintColor: '#6B7280',
    tabBarStyle: { backgroundColor: '#1F2937', borderTopColor: '#374151' },
  }}>
    <Tab.Screen name="FinanceTab" component={FinanceStack} options={{
      tabBarLabel: 'Finance',
      tabBarIcon: ({ color, size }) => <Ionicons name={'wallet-outline' as IconName} size={size} color={color} />,
    }} />
    <Tab.Screen name="ServicesTab" component={ServicesStack} options={{
      tabBarLabel: 'Services',
      tabBarIcon: ({ color, size }) => <Ionicons name={'construct-outline' as IconName} size={size} color={color} />,
    }} />
    <Tab.Screen name="ReportsTab" component={ReportsStack} options={{
      tabBarLabel: 'Reports',
      tabBarIcon: ({ color, size }) => <Ionicons name={'bar-chart-outline' as IconName} size={size} color={color} />,
    }} />
    <Tab.Screen name="ControlTab" component={ControlStack} options={{
      tabBarLabel: 'Control',
      tabBarIcon: ({ color, size }) => <Ionicons name={'settings-outline' as IconName} size={size} color={color} />,
    }} />
  </Tab.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

const Splash = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
    <ActivityIndicator size="large" color="#10B981" />
  </View>
);

export const Navigation = ({ isAuthenticated, isLoading }: { isAuthenticated: boolean; isLoading: boolean }) => (
  <NavigationContainer>
    {isLoading ? <Splash /> : isAuthenticated ? <AppTabs /> : <AuthStack />}
  </NavigationContainer>
);
