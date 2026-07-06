import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';
import { RootState } from '../../store';
import { useAppPreferences } from '../../context/AppPreferences';

const readTokenFromUrl = () => {
  if (typeof window === 'undefined') return '';
  if (typeof window === 'undefined' || !window.location) return '';
  return new URLSearchParams(window.location.search).get('token') || '';
};

export default function AcceptInviteScreen({ navigation }: any) {
  const { theme } = useAppPreferences();
  const styles = makeStyles(theme);
  const dispatch = useDispatch();
  const { isLoading } = useSelector((s: RootState) => s.auth);
  const [token, setToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setToken(readTokenFromUrl());
  }, []);

  const acceptInvite = async () => {
    if (!token.trim() || !fullName.trim() || password.length < 6) {
      Alert.alert('Invite details required', 'Enter your invite token, name, and a password with at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiService.acceptInvite({ token: token.trim(), fullName: fullName.trim(), phoneNumber, password });
      await AsyncStorage.setItem('accessToken', res.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(res.user));
      dispatch({ type: 'auth/check/fulfilled', payload: { accessToken: res.accessToken, user: res.user } });
    } catch (e: any) {
      Alert.alert('Invite failed', e?.response?.data?.message || e?.message || 'Could not accept this invite.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Accept Invitation</Text>
        <Text style={styles.subtitle}>Create your account to access the assigned villa.</Text>
        <TextInput style={styles.input} placeholder="Invite token" placeholderTextColor={theme.muted} value={token} onChangeText={setToken} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={theme.muted} value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="Phone number" placeholderTextColor={theme.muted} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.muted} value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={acceptInvite} disabled={saving || isLoading}>
          {saving ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.buttonText}>Accept Invite</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 18, gap: 12 },
  title: { color: theme.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: theme.muted, lineHeight: 20 },
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 11 },
  button: { backgroundColor: theme.primary, borderRadius: 10, minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: theme.onPrimary, fontWeight: '900' },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: theme.primary, fontWeight: '800' },
});
