import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';
import { useAppPreferences } from '../../context/AppPreferences';
import logo from '../../../assets/logo.png';

export default function LoginScreen({ navigation }: any) {
  const { theme, t, textAlign, rowDirection, direction } = useAppPreferences();
  const s = makeStyles(theme, textAlign, rowDirection, direction);
  const [email, setEmail] = useState('gm@villa.com');
  const [password, setPassword] = useState('password123');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const onLogin = async () => {
    if (!email || !password) { Alert.alert(t('error'), t('enterEmailPassword')); return; }
    const r = await dispatch(loginUser({ email, password }));
    if (loginUser.rejected.match(r)) Alert.alert(t('loginFailed'), r.payload as string);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Image source={logo} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>Villa Manager Pro</Text>
        <Text style={s.sub}>{t('financeOperations')}</Text>
        <View style={s.card}>
          <TextInput style={s.input} placeholder={t('email')} placeholderTextColor={theme.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={s.input} placeholder={t('password')} placeholderTextColor={theme.muted} value={password} onChangeText={setPassword} secureTextEntry />
          {error ? <Text style={s.err}>{error}</Text> : null}
          <TouchableOpacity style={[s.btn, isLoading && s.btnDim]} onPress={onLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={s.btnTxt}>{t('login')}</Text>}
          </TouchableOpacity>
          <View style={s.switchRow}>
            <Text style={s.switchText}>{t('needAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.switchLink}>{t('register')}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.hint}>
            <Text style={s.hintTitle}>{t('demoCredentials')}</Text>
            <Text style={s.hintTxt}>{t('email')}: gm@villa.com</Text>
            <Text style={s.hintTxt}>{t('password')}: password123</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any, textAlign: 'right' | 'left', rowDirection: 'row-reverse' | 'row', direction: 'rtl' | 'ltr') => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 132, height: 132, alignSelf: 'center', marginBottom: 16, borderRadius: 24 },
  title: { fontSize: 30, fontWeight: 'bold', color: theme.primary, textAlign: 'center', marginBottom: 8 },
  sub: { color: theme.muted, textAlign: 'center', marginBottom: 32, fontSize: 15, writingDirection: direction },
  card: { backgroundColor: theme.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border },
  input: { backgroundColor: theme.input, borderRadius: 10, padding: 14, color: theme.text, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: theme.border, textAlign, writingDirection: direction },
  btn: { backgroundColor: theme.primary, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 6 },
  btnDim: { opacity: 0.6 },
  btnTxt: { color: theme.onPrimary, fontSize: 16, fontWeight: '700' },
  err: { color: theme.danger, marginBottom: 10, textAlign: 'center' },
  switchRow: { flexDirection: rowDirection, justifyContent: 'center', marginTop: 16 },
  switchText: { color: theme.muted, fontSize: 14, writingDirection: direction },
  switchLink: { color: theme.primary, fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
  hint: { marginTop: 20, padding: 12, backgroundColor: theme.input, borderRadius: 8, borderLeftWidth: direction === 'ltr' ? 3 : 0, borderRightWidth: direction === 'rtl' ? 3 : 0, borderLeftColor: theme.primary, borderRightColor: theme.primary },
  hintTitle: { color: theme.primary, fontWeight: '600', marginBottom: 4, textAlign, writingDirection: direction },
  hintTxt: { color: theme.muted, fontSize: 13, textAlign, writingDirection: direction },
});
