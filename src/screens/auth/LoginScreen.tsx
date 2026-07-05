import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';

export default function LoginScreen() {
  const [email, setEmail] = useState('gm@villa.com');
  const [password, setPassword] = useState('password123');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const onLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Enter email and password'); return; }
    const r = await dispatch(loginUser({ email, password }));
    if (loginUser.rejected.match(r)) Alert.alert('Login Failed', r.payload as string);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Image source={require('../../../assets/logo.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>Villa Manager Pro</Text>
        <Text style={s.sub}>Finance & Operations Management</Text>
        <View style={s.card}>
          <TextInput style={s.input} placeholder="Email" placeholderTextColor="#6B7280" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={s.input} placeholder="Password" placeholderTextColor="#6B7280" value={password} onChangeText={setPassword} secureTextEntry />
          {error ? <Text style={s.err}>{error}</Text> : null}
          <TouchableOpacity style={[s.btn, isLoading && s.btnDim]} onPress={onLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Login</Text>}
          </TouchableOpacity>
          <View style={s.hint}>
            <Text style={s.hintTitle}>Demo Credentials</Text>
            <Text style={s.hintTxt}>Email: gm@villa.com</Text>
            <Text style={s.hintTxt}>Password: password123</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 132, height: 132, alignSelf: 'center', marginBottom: 16, borderRadius: 24 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#10B981', textAlign: 'center', marginBottom: 8 },
  sub: { color: '#9CA3AF', textAlign: 'center', marginBottom: 32, fontSize: 15 },
  card: { backgroundColor: '#1F2937', borderRadius: 16, padding: 20 },
  input: { backgroundColor: '#374151', borderRadius: 10, padding: 14, color: '#fff', marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#4B5563' },
  btn: { backgroundColor: '#10B981', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 6 },
  btnDim: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  err: { color: '#EF4444', marginBottom: 10, textAlign: 'center' },
  hint: { marginTop: 20, padding: 12, backgroundColor: '#111827', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#10B981' },
  hintTitle: { color: '#10B981', fontWeight: '600', marginBottom: 4 },
  hintTxt: { color: '#9CA3AF', fontSize: 13 },
});
