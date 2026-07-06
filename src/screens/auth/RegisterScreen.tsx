import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';
import { useAppPreferences } from '../../context/AppPreferences';
import logo from '../../../assets/logo.png';

export default function RegisterScreen({ navigation }: any) {
  const { theme, t, textAlign, rowDirection, direction } = useAppPreferences();
  const s = makeStyles(theme, textAlign, rowDirection, direction);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const onRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert(t('error'), t('enterRegisterFields'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error'), t('passwordMin'));
      return;
    }
    const result = await dispatch(registerUser({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      phoneNumber: phoneNumber.trim(),
    }));
    if (registerUser.rejected.match(result)) {
      Alert.alert(t('registrationFailed'), result.payload as string);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.card}>
          <Image source={logo} style={s.logo} resizeMode="contain" />
          <Text style={s.title}>Villa Manager Pro</Text>
          <Text style={s.sub}>{t('createManagementAccount')}</Text>

          <Text style={s.label}>{t('fullName')}</Text>
          <TextInput style={s.input} placeholder={t('yourFullName')} placeholderTextColor={theme.muted} value={fullName} onChangeText={setFullName} />
          <Text style={s.label}>{t('email')}</Text>
          <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={theme.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.label}>{t('passwordMinLabel')}</Text>
          <TextInput style={s.input} placeholder={t('choosePassword')} placeholderTextColor={theme.muted} value={password} onChangeText={setPassword} secureTextEntry />
          <Text style={s.label}>{t('phone')}</Text>
          <TextInput style={s.input} placeholder={t('optional')} placeholderTextColor={theme.muted} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />

          {error ? <Text style={s.err}>{error}</Text> : null}
          <TouchableOpacity style={[s.btn, isLoading && s.btnDim]} onPress={onRegister} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={s.btnTxt}>{t('createAccount')}</Text>}
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchText}>{t('haveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={s.switchLink}>{t('signIn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any, textAlign: 'right' | 'left', rowDirection: 'row-reverse' | 'row', direction: 'rtl' | 'ltr') => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  inner: { flex: 1, justifyContent: 'center', padding: 22 },
  card: { backgroundColor: theme.card, borderRadius: 18, padding: 24, borderWidth: 1, borderColor: theme.border },
  logo: { width: 156, height: 156, alignSelf: 'center', marginBottom: 14, borderRadius: 24 },
  title: { color: theme.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  sub: { color: theme.muted, textAlign: 'center', marginTop: 6, marginBottom: 22, fontSize: 15, writingDirection: direction },
  label: { color: theme.label, fontSize: 13, fontWeight: '800', marginBottom: 6, textAlign, writingDirection: direction },
  input: { backgroundColor: theme.input, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 14, color: theme.text, fontSize: 15, marginBottom: 14, textAlign, writingDirection: direction },
  btn: { backgroundColor: theme.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  btnDim: { opacity: 0.65 },
  btnTxt: { color: theme.onPrimary, fontSize: 16, fontWeight: '900' },
  err: { color: theme.danger, marginBottom: 10, textAlign: 'center' },
  switchRow: { flexDirection: rowDirection, justifyContent: 'center', marginTop: 20 },
  switchText: { color: theme.muted, fontSize: 15, writingDirection: direction },
  switchLink: { color: theme.primary, fontSize: 15, fontWeight: '900', textDecorationLine: 'underline' },
});
