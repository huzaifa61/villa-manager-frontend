import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
export default function ServiceRequestsScreen() {
  return (
    <View style={s.c}>
      <Text style={s.icon}>🔧 Service Requests</Text>
      <Text style={s.txt}>Services coming soon</Text>
    </View>
  );
}
const s = StyleSheet.create({ c: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' }, icon: { fontSize: 60, marginBottom: 16 }, txt: { color: '#9CA3AF', fontSize: 18 } });
