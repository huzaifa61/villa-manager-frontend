import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AcceptInviteScreen from '../screens/auth/AcceptInviteScreen';
import VillaSelectorScreen from '../screens/auth/VillaSelectorScreen';
import DashboardScreen from '../screens/finance/DashboardScreen';
import ApartmentsScreen from '../screens/finance/ApartmentsScreen';
import PaymentsScreen from '../screens/finance/PaymentsScreen';
import ExpensesScreen from '../screens/finance/ExpensesScreen';
import AddVillaScreen from '../screens/villas/AddVillaScreen';
import NotificationsScreen from '../screens/NotificationsScreen';import ServiceRequestsScreen from '../screens/services/ServiceRequestsScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import ControlScreen from '../screens/control/ControlScreen';
import BackupsScreen from '../screens/control/BackupsScreen';
import VillasScreen from '../screens/control/VillasScreen';
import VendorsScreen from '../screens/control/VendorsScreen';
import DocumentsScreen from '../screens/control/DocumentsScreen';
import VillaMembersScreen from '../screens/control/VillaMembersScreen';
import SettingsScreen from '../screens/control/SettingsScreen';
import HelpGuideScreen from '../screens/control/HelpGuideScreen';
import { useAppPreferences } from '../context/AppPreferences';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const useHeaderOpts = () => {
  const { theme } = useAppPreferences();
  return {
    headerStyle: { backgroundColor: theme.header },
    headerTintColor: theme.text,
    headerTitleStyle: { fontWeight: '600' as const },
  };
};

const FinanceStack = () => {
  const headerOpts = useHeaderOpts();
  const { t } = useAppPreferences();
  return (
  <Stack.Navigator id="FinanceStack" screenOptions={headerOpts}>
    <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: t('dashboard') }} />
    <Stack.Screen name="Apartments" component={ApartmentsScreen} options={{ title: t('apartments') }} />
    <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: t('payments') }} />
    <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: t('expenses') }} />
    <Stack.Screen name="Villas" component={VillasScreen} options={{ title: 'Properties' }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
  );
};

const ServicesStack = () => {
  const headerOpts = useHeaderOpts();
  const { t } = useAppPreferences();
  return (
  <Stack.Navigator id="ServicesStack" screenOptions={headerOpts}>
    <Stack.Screen name="Services" component={ServiceRequestsScreen} options={{ title: t('services') }} />
  </Stack.Navigator>
  );
};

const ReportsStack = () => {
  const headerOpts = useHeaderOpts();
  const { t } = useAppPreferences();
  return (
  <Stack.Navigator id="ReportsStack" screenOptions={headerOpts}>
    <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: t('reports') }} />
  </Stack.Navigator>
  );
};

const ControlStack = () => {
  const headerOpts = useHeaderOpts();
  const { t } = useAppPreferences();
  return (
  <Stack.Navigator id="ControlStack" screenOptions={headerOpts}>
    <Stack.Screen name="Control" component={ControlScreen} options={{ title: t('control') }} />
    <Stack.Screen name="Villas" component={VillasScreen} />
    <Stack.Screen name="VillaMembers" component={VillaMembersScreen} options={{ title: t('villaMembers') }} />
    <Stack.Screen name="Vendors" component={VendorsScreen} />
    <Stack.Screen name="Documents" component={DocumentsScreen} />
    <Stack.Screen name="Backups" component={BackupsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings') }} />
    <Stack.Screen name="HelpGuide" component={HelpGuideScreen} options={{ title: t('helpGuide') }} />
  </Stack.Navigator>
  );
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const AppTabs = () => {
  const { theme, t } = useAppPreferences();
  return (
  <Tab.Navigator id="AppTabs" screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.muted,
    tabBarStyle: { backgroundColor: theme.header, borderTopColor: theme.border },
  }}>
    <Tab.Screen name="FinanceTab" component={FinanceStack} options={{
      tabBarLabel: t('financeOperations').replace(' & Operations Management', ''),
      tabBarIcon: ({ color, size }) => <Ionicons name={'wallet-outline' as IconName} size={size} color={color} />,
    }} />
    <Tab.Screen name="ServicesTab" component={ServicesStack} options={{
      tabBarLabel: t('services'),
      tabBarIcon: ({ color, size }) => <Ionicons name={'construct-outline' as IconName} size={size} color={color} />,
    }} />
    <Tab.Screen name="ReportsTab" component={ReportsStack} options={{
      tabBarLabel: t('reports'),
      tabBarIcon: ({ color, size }) => <Ionicons name={'bar-chart-outline' as IconName} size={size} color={color} />,
    }} />
    <Tab.Screen name="ControlTab" component={ControlStack} options={{
      tabBarLabel: t('control'),
      tabBarIcon: ({ color, size }) => <Ionicons name={'settings-outline' as IconName} size={size} color={color} />,
    }} />
  </Tab.Navigator>
  );
};

const shouldOpenInvite = () => {
  if (typeof window === 'undefined' || !window.location) return false;
  return window.location.pathname.includes('accept-invite') || window.location.search.includes('token=');
};

const AuthStack = () => (
  <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false }} initialRouteName={shouldOpenInvite() ? 'AcceptInvite' : 'Login'}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="AcceptInvite" component={AcceptInviteScreen} />
  </Stack.Navigator>
);

const Splash = () => {
  const { theme } = useAppPreferences();
  return (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
    <ActivityIndicator size="large" color={theme.primary} />
  </View>
  );
};

export const Navigation = ({ isAuthenticated, isLoading }: { isAuthenticated: boolean; isLoading: boolean }) => {
  const { theme } = useAppPreferences();
  const { activeVillaId } = useSelector((s: RootState) => s.auth);
  const auth = useSelector((s: RootState) => s.auth);

  const navTheme = {
    dark: theme.mode === 'dark',
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.header,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  };

  const renderContent = () => {
    if (isLoading) return <Splash />;
    if (!isAuthenticated) return <AuthStack />;
    // Show VillaSelector for GM only if no active villa AND no user-assigned villa
    const isGM = auth.user?.role === 'GENERAL_MANAGER';
    const hasVilla = activeVillaId && activeVillaId > 0;
    const hasAssignedVilla = auth.user?.villaId && auth.user.villaId > 0;
    if (isGM && !hasVilla && !hasAssignedVilla) return <VillaSelectorScreen />;
    return <AppTabs />;
  };

  return (
    <NavigationContainer theme={navTheme}>
      {renderContent()}
    </NavigationContainer>
  );
};