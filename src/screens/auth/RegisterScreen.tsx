import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';

export default function RegisterScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const onRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Enter your name, email, and password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    const result = await dispatch(registerUser({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      phoneNumber: phoneNumber.trim(),
    }));
    if (registerUser.rejected.match(result)) {
      Alert.alert('Registration Failed', result.payload as string);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.card}>
          <Image source={require('../../../assets/logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.title}>Villa Manager Pro</Text>
          <Text style={s.sub}>Create your management account</Text>

          <Text style={s.label}>Full Name</Text>
          <TextInput style={s.input} placeholder="Your full name" placeholderTextColor="#6B7280" value={fullName} onChangeText={setFullName} />
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor="#6B7280" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.label}>Password (min 6 chars)</Text>
          <TextInput style={s.input} placeholder="Choose a password" placeholderTextColor="#6B7280" value={password} onChangeText={setPassword} secureTextEntry />
          <Text style={s.label}>Phone</Text>
          <TextInput style={s.input} placeholder="Optional" placeholderTextColor="#6B7280" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />

          {error ? <Text style={s.err}>{error}</Text> : null}
          <TouchableOpacity style={[s.btn, isLoading && s.btnDim]} onPress={onRegister} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#052E1B" /> : <Text style={s.btnTxt}>Create Account</Text>}
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchText}>Have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.switchLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1413' },
  inner: { flex: 1, justifyContent: 'center', padding: 22 },
  card: { backgroundColor: '#102629', borderRadius: 18, padding: 24, borderWidth: 1, borderColor: '#1F3F46' },
  logo: { width: 156, height: 156, alignSelf: 'center', marginBottom: 14, borderRadius: 24 },
  title: { color: '#F9FAFB', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  sub: { color: '#A7BDB4', textAlign: 'center', marginTop: 6, marginBottom: 22, fontSize: 15 },
  label: { color: '#A7BDB4', fontSize: 13, fontWeight: '800', marginBottom: 6 },
  input: { backgroundColor: '#0B1719', borderRadius: 10, borderWidth: 1, borderColor: '#26434A', padding: 14, color: '#fff', fontSize: 15, marginBottom: 14 },
  btn: { backgroundColor: '#4ADE80', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  btnDim: { opacity: 0.65 },
  btnTxt: { color: '#052E1B', fontSize: 16, fontWeight: '900' },
  err: { color: '#FCA5A5', marginBottom: 10, textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { color: '#A7BDB4', fontSize: 15 },
  switchLink: { color: '#86EFAC', fontSize: 15, fontWeight: '900', textDecorationLine: 'underline' },
});
