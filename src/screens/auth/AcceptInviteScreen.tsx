import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';
import { RootState } from '../../store';
import { useAppPreferences } from '../../context/AppPreferences';

const readTokenFromUrl = () => {
  if (typeof window === 'undefined' || !window.location) return '';
  return new URLSearchParams(window.location.search).get('token') || '';
};

const clearInviteUrl = () => {
  if (typeof window !== 'undefined' && window?.history?.replaceState) {
    window.history.replaceState({}, document.title, '/');
  }
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
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  // Inline validation errors
  const [errors, setErrors] = useState<{ token?: string; fullName?: string; password?: string }>({});

  // Top-level status message (for API errors like expired/invalid)
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    const urlToken = readTokenFromUrl();
    setToken(urlToken);
    if (urlToken) {
      AsyncStorage.getItem('acceptedTokens').then((raw) => {
        const accepted: string[] = raw ? JSON.parse(raw) : [];
        if (accepted.includes(urlToken)) setAlreadyAccepted(true);
      });
    }
  }, []);

  const goToLogin = () => {
    clearInviteUrl();
    navigation.navigate('Login');
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!token.trim()) newErrors.token = 'Invite token is required';
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const acceptInvite = async () => {
    setStatusMsg(null);
    if (!validate()) return; // show inline errors, stop here

    setSaving(true);
    try {
      const res = await apiService.acceptInvite({
        token: token.trim(),
        fullName: fullName.trim(),
        phoneNumber,
        password,
      });

      // Mark token as accepted locally
      const raw = await AsyncStorage.getItem('acceptedTokens');
      const accepted: string[] = raw ? JSON.parse(raw) : [];
      if (!accepted.includes(token.trim())) {
        accepted.push(token.trim());
        await AsyncStorage.setItem('acceptedTokens', JSON.stringify(accepted));
      }

      clearInviteUrl();

      // Show success then redirect to login
      setStatusMsg({ type: 'warning', text: '✅ Account created! Please log in with your email and password.' });
      setTimeout(() => navigation.navigate('Login'), 2500);

    } catch (e: any) {
      const errorField: string = e?.response?.data?.error || '';
      const msgField: string = e?.response?.data?.message || e?.message || '';
      const combined = (errorField + ' ' + msgField).toLowerCase();

      if (combined.includes('already') || combined.includes('active')) {
        setAlreadyAccepted(true);
      } else if (combined.includes('expired')) {
        setStatusMsg({
          type: 'error',
          text: '⏰ This invitation link has expired. Please ask the admin to send a new invite.',
        });
      } else if (combined.includes('invalid') || combined.includes('not found') || combined.includes('bad request')) {
        setStatusMsg({
          type: 'error',
          text: '❌ This invitation token is invalid or has already been used. Please ask the admin for a new invite.',
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: errorField || msgField || 'Could not accept this invite. Please try again.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Already accepted screen
  if (alreadyAccepted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.checkmark}>✅</Text>
          <Text style={styles.title}>Already Accepted</Text>
          <Text style={styles.subtitle}>
            This invitation has already been accepted. Please log in with your email and password.
          </Text>
          <TouchableOpacity style={styles.button} onPress={goToLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Accept Invitation</Text>
        <Text style={styles.subtitle}>Create your account to access the assigned villa.</Text>

        {/* API status message */}
        {statusMsg && (
          <View style={[styles.statusBox, statusMsg.type === 'error' ? styles.statusError : styles.statusSuccess]}>
            <Text style={styles.statusText}>{statusMsg.text}</Text>
          </View>
        )}

        {/* Token */}
        <View>
          <TextInput
            style={[styles.input, errors.token ? styles.inputError : null]}
            placeholder="Invite token"
            placeholderTextColor={theme.muted}
            value={token}
            onChangeText={(v) => { setToken(v); setErrors(p => ({ ...p, token: undefined })); setStatusMsg(null); }}
            autoCapitalize="none"
          />
          {errors.token ? <Text style={styles.errorText}>{errors.token}</Text> : null}
        </View>

        {/* Full Name */}
        <View>
          <TextInput
            style={[styles.input, errors.fullName ? styles.inputError : null]}
            placeholder="Full name *"
            placeholderTextColor={theme.muted}
            value={fullName}
            onChangeText={(v) => { setFullName(v); setErrors(p => ({ ...p, fullName: undefined })); }}
          />
          {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
        </View>

        {/* Phone */}
        <TextInput
          style={styles.input}
          placeholder="Phone number (optional)"
          placeholderTextColor={theme.muted}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />

        {/* Password */}
        <View>
          <TextInput
            style={[styles.input, errors.password ? styles.inputError : null]}
            placeholder="Password (min 6 chars) *"
            placeholderTextColor={theme.muted}
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: undefined })); }}
            secureTextEntry
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.button, (saving || isLoading) && styles.buttonDisabled]}
          onPress={acceptInvite}
          disabled={saving || isLoading}
        >
          {saving
            ? <ActivityIndicator color={theme.onPrimary} />
            : <Text style={styles.buttonText}>Accept Invite</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={goToLogin}>
          <Text style={styles.linkText}>Already accepted? Log in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: theme.background, justifyContent: 'center', padding: 20 },
  card:          { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 18, gap: 10 },
  checkmark:     { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title:         { color: theme.text, fontSize: 24, fontWeight: '900' },
  subtitle:      { color: theme.muted, lineHeight: 20 },
  input:         { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 11 },
  inputError:    { borderColor: '#EF4444', borderWidth: 1.5 },
  errorText:     { color: '#EF4444', fontSize: 12, fontWeight: '600', marginTop: 4, marginLeft: 4 },
  statusBox:     { borderRadius: 8, padding: 12, borderWidth: 1 },
  statusError:   { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  statusSuccess: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  statusText:    { fontSize: 13, fontWeight: '700', color: '#1F2937', lineHeight: 20 },
  button:        { backgroundColor: theme.primary, borderRadius: 10, minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonDisabled:{ opacity: 0.6 },
  buttonText:    { color: theme.onPrimary, fontWeight: '900' },
  link:          { alignItems: 'center', paddingVertical: 8 },
  linkText:      { color: theme.primary, fontWeight: '800' },
});
