import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAppPreferences } from '../../context/AppPreferences';

const SplashScreen = () => {
  const { theme } = useAppPreferences();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <Text style={{ color: theme.text, fontSize: 24, marginBottom: 20 }}>Villa Manager Pro</Text>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
};

export default SplashScreen;
