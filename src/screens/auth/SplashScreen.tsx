import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

const SplashScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2937' }}>
    <Text style={{ color: '#fff', fontSize: 24, marginBottom: 20 }}>Villa Manager Pro</Text>
    <ActivityIndicator size="large" color="#10B981" />
  </View>
);

export default SplashScreen;
