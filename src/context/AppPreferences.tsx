import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';

export type AppLanguage = 'en' | 'ar';
export type AppThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'villa-app-preferences-v1';

const translations: Record<AppLanguage, Record<string, string>> = {
  en: {
    settings: 'Settings',
    settingsSubtitle: 'Villa details, instructions, and app preferences.',
    guardedActionsSubtitle: 'Villa details, instructions, and guarded actions.',
    appearance: 'Appearance',
    language: 'Language',
    theme: 'Theme',
    english: 'English',
    arabic: 'Arabic',
    dark: 'Dark',
    light: 'Light',
    villaSettings: 'Villa Settings',
    villaName: 'Villa / Building Name',
    address: 'Address',
    whatsappLink: 'WhatsApp Group Link',
    whatsappNotes: 'WhatsApp Group Notes',
    documentInstructions: 'Document Instructions',
    notes: 'Notes',
    villaNamePlaceholder: 'Villa name',
    sharingInstructions: 'Sharing instructions',
    documentStoragePlaceholder: 'Where large files should be stored',
    villaNotesPlaceholder: 'Villa notes',
    saveVillaSettings: 'Save Villa Settings',
    saving: 'Saving...',
    dangerZone: 'Danger Zone',
    dangerText: 'This clears expenses, payments, and service requests while keeping apartments. Download CSV exports first if you need a record.',
    resetVillaData: 'Reset Villa Data',
    typeReset: 'Type RESET',
    nameRequired: 'Name required',
    nameRequiredBody: 'Please enter the villa name.',
    saved: 'Saved',
    savedBody: 'Villa settings were updated.',
    couldNotSave: 'Could not save',
    confirmationRequired: 'Confirmation required',
    confirmationBody: 'Type RESET before resetting villa data.',
    resetQuestion: 'Reset villa data?',
    resetBody: 'Expenses, payments, and service requests will be cleared. Apartments will be kept.',
    cancel: 'Cancel',
    reset: 'Reset',
    resetComplete: 'Reset complete',
    resetCompleteBody: 'Villa data has been reset.',
    error: 'Error',
    enterEmailPassword: 'Enter email and password',
    loginFailed: 'Login Failed',
    registrationFailed: 'Registration Failed',
    enterRegisterFields: 'Enter your name, email, and password',
    passwordMin: 'Password must be at least 6 characters',
    passwordMinLabel: 'Password (min 6 chars)',
    optional: 'Optional',
    yourFullName: 'Your full name',
    login: 'Login',
    email: 'Email',
    password: 'Password',
    needAccount: 'Need an account?',
    register: 'Register',
    demoCredentials: 'Demo Credentials',
    financeOperations: 'Finance & Operations Management',
    createAccount: 'Create Account',
    signIn: 'Sign in',
    haveAccount: 'Have an account?',
    fullName: 'Full Name',
    phone: 'Phone',
    choosePassword: 'Choose a password',
    createManagementAccount: 'Create your management account',
    dashboard: 'Dashboard',
    apartments: 'Apartments',
    payments: 'Payments',
    expenses: 'Expenses',
    services: 'Services',
    reports: 'Reports',
    control: 'Control',
    helpGuide: 'Help Guide',
    finance: 'Finance',
    vendors: 'Vendors',
    villas: 'Villas',
    villasDetail: 'Create villas and assign Villa Managers.',
    villaMembers: 'Villa Members',
    villaMembersDetail: 'Invite members and explain login access levels.',
    documents: 'Documents',
    backups: 'Backups',
    providerDirectory: 'Provider directory with CSV export.',
    documentsDetail: 'Reference notes, links, renewals, and records.',
    backupsDetail: 'Export villa data for safekeeping.',
    settingsDetail: 'Villa details, WhatsApp notes, and reset tools.',
    helpGuideDetail: 'Role-based workflow guide for the app.',
    controlSubtitle: 'Manage operational sections and support tools.',
  },
  ar: {
    settings: 'الإعدادات',
    settingsSubtitle: 'تفاصيل الفيلا والتعليمات وتفضيلات التطبيق.',
    guardedActionsSubtitle: 'تفاصيل الفيلا والتعليمات والإجراءات المحمية.',
    appearance: 'المظهر',
    language: 'اللغة',
    theme: 'السمة',
    english: 'الإنجليزية',
    arabic: 'العربية',
    dark: 'داكن',
    light: 'فاتح',
    villaSettings: 'إعدادات الفيلا',
    villaName: 'اسم الفيلا / المبنى',
    address: 'العنوان',
    whatsappLink: 'رابط مجموعة واتساب',
    whatsappNotes: 'ملاحظات مجموعة واتساب',
    documentInstructions: 'تعليمات المستندات',
    notes: 'ملاحظات',
    villaNamePlaceholder: 'اسم الفيلا',
    sharingInstructions: 'تعليمات المشاركة',
    documentStoragePlaceholder: 'مكان حفظ الملفات الكبيرة',
    villaNotesPlaceholder: 'ملاحظات الفيلا',
    saveVillaSettings: 'حفظ إعدادات الفيلا',
    saving: 'جار الحفظ...',
    dangerZone: 'منطقة الخطر',
    dangerText: 'سيتم حذف المصروفات والمدفوعات وطلبات الخدمة مع الاحتفاظ بالشقق. قم بتنزيل ملفات CSV أولاً إذا كنت تحتاج إلى سجل.',
    resetVillaData: 'إعادة ضبط بيانات الفيلا',
    typeReset: 'اكتب RESET',
    nameRequired: 'الاسم مطلوب',
    nameRequiredBody: 'يرجى إدخال اسم الفيلا.',
    saved: 'تم الحفظ',
    savedBody: 'تم تحديث إعدادات الفيلا.',
    couldNotSave: 'تعذر الحفظ',
    confirmationRequired: 'التأكيد مطلوب',
    confirmationBody: 'اكتب RESET قبل إعادة ضبط بيانات الفيلا.',
    resetQuestion: 'إعادة ضبط بيانات الفيلا؟',
    resetBody: 'سيتم حذف المصروفات والمدفوعات وطلبات الخدمة. سيتم الاحتفاظ بالشقق.',
    cancel: 'إلغاء',
    reset: 'إعادة ضبط',
    resetComplete: 'اكتملت إعادة الضبط',
    resetCompleteBody: 'تمت إعادة ضبط بيانات الفيلا.',
    error: 'خطأ',
    enterEmailPassword: 'أدخل البريد الإلكتروني وكلمة المرور',
    loginFailed: 'فشل تسجيل الدخول',
    registrationFailed: 'فشل إنشاء الحساب',
    enterRegisterFields: 'أدخل الاسم والبريد الإلكتروني وكلمة المرور',
    passwordMin: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل',
    passwordMinLabel: 'كلمة المرور (6 أحرف على الأقل)',
    optional: 'اختياري',
    yourFullName: 'اسمك الكامل',
    login: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    needAccount: 'تحتاج إلى حساب؟',
    register: 'إنشاء حساب',
    demoCredentials: 'بيانات الدخول التجريبية',
    financeOperations: 'إدارة المالية والعمليات',
    createAccount: 'إنشاء حساب',
    signIn: 'تسجيل الدخول',
    haveAccount: 'لديك حساب؟',
    fullName: 'الاسم الكامل',
    phone: 'الهاتف',
    choosePassword: 'اختر كلمة مرور',
    createManagementAccount: 'أنشئ حساب الإدارة الخاص بك',
    dashboard: 'لوحة التحكم',
    apartments: 'الشقق',
    payments: 'المدفوعات',
    expenses: 'المصروفات',
    services: 'الخدمات',
    reports: 'التقارير',
    control: 'التحكم',
    helpGuide: 'دليل المساعدة',
    finance: 'المالية',
    vendors: 'الموردون',
    villas: 'الفلل',
    villasDetail: 'إنشاء الفلل وتعيين مديري الفلل.',
    villaMembers: 'أعضاء الفيلا',
    villaMembersDetail: 'دعوة الأعضاء وشرح مستويات الدخول.',
    documents: 'المستندات',
    backups: 'النسخ الاحتياطية',
    providerDirectory: 'دليل مزودي الخدمة مع تصدير CSV.',
    documentsDetail: 'ملاحظات وروابط وتجديدات وسجلات مرجعية.',
    backupsDetail: 'تصدير بيانات الفيلا للحفظ.',
    settingsDetail: 'تفاصيل الفيلا وملاحظات واتساب وأدوات إعادة الضبط.',
    helpGuideDetail: 'دليل سير العمل حسب الأدوار داخل التطبيق.',
    controlSubtitle: 'إدارة الأقسام التشغيلية وأدوات الدعم.',
  },
};

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
