// App.tsx
import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { injectStore } from './src/services/api';
import { loadAppState, fetchAuthConfig } from './src/store/slices/appSlice';
import { setCredentials } from './src/store/slices/authSlice';
import { RootNavigator } from './src/navigation/RootNavigator';

// Inject the store into the API module at runtime to avoid circular dependency
injectStore(store);

// Dispatch app initialization thunks immediately
store.dispatch(loadAppState()).then((action: any) => {
  // Restore authentication state from persisted SecureStore data
  if (action.type === 'app/loadAppState/fulfilled') {
    const { accessToken, refreshToken, userData } = action.payload;
    if (accessToken && refreshToken && userData) {
      store.dispatch(setCredentials({
        user: userData,
        accessToken,
        refreshToken,
      }));
    }
  }
});
store.dispatch(fetchAuthConfig());

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
