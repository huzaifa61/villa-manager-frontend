import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState, AppDispatch } from './store';
import { Navigation } from './navigation';
import { checkAuth } from './store/slices/authSlice';
import { AppPreferencesProvider, useAppPreferences } from './context/AppPreferences';

const AppContent = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((s: RootState) => s.auth);
  const { theme } = useAppPreferences();
  useEffect(() => { dispatch(checkAuth()); }, []);
  return (
    <>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.header} />
      <Navigation isAuthenticated={isAuthenticated} isLoading={isLoading} />
    </>
  );
};

const App = () => (
  <Provider store={store}>
    <AppPreferencesProvider>
      <AppContent />
    </AppPreferencesProvider>
  </Provider>
);

export default App;
