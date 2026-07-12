import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import { AppLanguage, translations } from '../i18n/translations';

export type { AppLanguage };
export type AppThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'villa-app-preferences-v1';

const palettes = {
  dark: {
    mode: 'dark' as const,
    background: '#111827',
    header: '#1F2937',
    card: '#1F2937',
    input: '#111827',
    border: '#374151',
    text: '#FFFFFF',
    muted: '#9CA3AF',
    subtleText: '#D1D5DB',
    label: '#A7F3D0',
    primary: '#10B981',
    secondary: '#3B82F6',
    danger: '#EF4444',
    warning: '#F59E0B',
    chip: '#374151',
    onPrimary: '#FFFFFF',
    shadow: '#000000',
    dangerPanel: '#1F171A',
    dangerBorder: '#7F1D1D',
    dangerText: '#FCA5A5',
    statusBar: 'light-content' as const,
  },
  light: {
    mode: 'light' as const,
    background: '#F3F4F6',
    header: '#FFFFFF',
    card: '#FFFFFF',
    input: '#F9FAFB',
    border: '#D1D5DB',
    text: '#111827',
    muted: '#6B7280',
    subtleText: '#374151',
    label: '#047857',
    primary: '#059669',
    secondary: '#2563EB',
    danger: '#DC2626',
    warning: '#D97706',
    chip: '#E5E7EB',
    onPrimary: '#FFFFFF',
    shadow: '#9CA3AF',
    dangerPanel: '#FEF2F2',
    dangerBorder: '#FCA5A5',
    dangerText: '#991B1B',
    statusBar: 'dark-content' as const,
  },
};

export type AppTheme = (typeof palettes)[AppThemeMode];

type AppPreferencesContextValue = {
  language: AppLanguage;
  themeMode: AppThemeMode;
  isArabic: boolean;
  theme: AppTheme;
  direction: 'rtl' | 'ltr';
  textAlign: 'right' | 'left';
  rowDirection: 'row-reverse' | 'row';
  setLanguage: (language: AppLanguage) => Promise<void>;
  setThemeMode: (themeMode: AppThemeMode) => Promise<void>;
  t: (key: string) => string;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export const AppPreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [themeMode, setThemeModeState] = useState<AppThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.language === 'en' || saved.language === 'ar') setLanguageState(saved.language);
      if (saved.themeMode === 'dark' || saved.themeMode === 'light') setThemeModeState(saved.themeMode);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const isRTL = language === 'ar';
    I18nManager.allowRTL(isRTL);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [language]);

  const persist = async (nextLanguage: AppLanguage, nextThemeMode: AppThemeMode) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ language: nextLanguage, themeMode: nextThemeMode }));
  };

  const value = useMemo(() => {
    const theme = palettes[themeMode];
    const direction: 'rtl' | 'ltr' = language === 'ar' ? 'rtl' : 'ltr';
    const textAlign: 'right' | 'left' = language === 'ar' ? 'right' : 'left';
    const rowDirection: 'row-reverse' | 'row' = language === 'ar' ? 'row-reverse' : 'row';
    return {
      language,
      themeMode,
      isArabic: language === 'ar',
      theme,
      direction,
      textAlign,
      rowDirection,
      setLanguage: async (nextLanguage: AppLanguage) => {
        setLanguageState(nextLanguage);
        await persist(nextLanguage, themeMode);
      },
      setThemeMode: async (nextThemeMode: AppThemeMode) => {
        setThemeModeState(nextThemeMode);
        await persist(language, nextThemeMode);
      },
      t: (key: string) => translations[language][key] || translations.en[key] || key,
    };
  }, [language, themeMode]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
};

export const useAppPreferences = () => {
  const value = useContext(AppPreferencesContext);
  if (!value) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return value;
};
