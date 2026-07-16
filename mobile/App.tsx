// App.tsx
import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { store } from './src/store';
import { useAppDispatch } from './src/store';
import { injectStore } from './src/services/api';
import { loadAppState, fetchAuthConfig, setAppReady } from './src/store/slices/appSlice';
import { setCredentials } from './src/store/slices/authSlice';
import { RootNavigator } from './src/navigation/RootNavigator';

// Inject the store into the API module at runtime to avoid circular dependency
injectStore(store);

// Deep linking configuration
//
// Navigation hierarchy:
//   NavigationContainer
//     -> RootNavigator (plain component, NOT a navigator)
//       -> AppStack (Stack.Navigator) when authenticated or guest
//         -> MainTabs, PostDetail, UserProfile, etc.
//       -> AuthStack when unauthenticated (non-guest)
//
// Since RootNavigator is not a navigator, the linking config maps directly
// to the screens inside AppStack's Stack.Navigator. There is no intermediate
// navigator name to reference.
//
// For guest users: RootNavigator renders AppStack, so deep links to PostDetail
// and UserProfile work immediately. Guest users can view posts and profiles
// without authentication.
//
// For unauthenticated (non-guest) users: RootNavigator renders AuthStack.
// Deep links are queued by React Navigation and will resolve once the user
// signs in or continues as guest (which triggers AppStack to mount).
//
// Path patterns match AndroidManifest.xml intent-filter pathPrefixes:
//   /p/* -> PostDetail (postId param)
//   /u/* -> UserProfile (userId param)
//
// Future paths (/c/*, /e/*, /m/*) can be added here once their corresponding
// screens are implemented in AppStack.
const linking = {
  prefixes: [
    Linking.createURL('/'),
    'artnepalaya://',
    'https://app.artnepalaya.com',
  ],
  config: {
    screens: {
      // Screens inside AppStack's Stack.Navigator
      PostDetail: {
        path: 'p/:postId',
      },
      UserProfile: {
        path: 'u/:userId',
      },
    },
  },
};

/**
 * AppInitializer renders inside <Provider> so it can use hooks.
 * It ensures auth state is fully restored BEFORE setting isAppReady,
 * preventing the brief flash of AuthStack that occurred with the old
 * module-level .then() pattern.
 */
function AppInitializer() {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    const init = async () => {
      const action = await dispatch(loadAppState());
      if (action.type === 'app/loadAppState/fulfilled') {
        const { accessToken, refreshToken, userData } = action.payload as any;
        if (accessToken && refreshToken && userData) {
          dispatch(setCredentials({ user: userData, accessToken, refreshToken }));
        }
      }
      // Only now is the app truly ready - auth state is guaranteed settled
      dispatch(setAppReady());
    };
    init();
    dispatch(fetchAuthConfig());
  }, [dispatch]);

  return <RootNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <AppInitializer />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
