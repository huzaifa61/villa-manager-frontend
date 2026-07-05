import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState, AppDispatch } from './store';
import { Navigation } from './navigation';
import { checkAuth } from './store/slices/authSlice';

const AppContent = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((s: RootState) => s.auth);
  useEffect(() => { dispatch(checkAuth()); }, []);
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <Navigation isAuthenticated={isAuthenticated} isLoading={isLoading} />
    </>
  );
};

const App = () => (
  <Provider store={store}>
    <AppContent />
  </Provider>
);

export default App;
