/**
 * @format
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppToastMessage } from './src/components/common/AppToastMessage';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthHydrationGate } from './src/providers/AuthHydrationGate';
import { store } from './src/store';
import { ThemeProvider } from './src/theme';
import { configureGoogleSignIn } from './src/services/googleNativeSignIn';
import { initializeAdMob } from './src/services/admob';

enableScreens(true);

function App() {
  useEffect(() => {
    configureGoogleSignIn();
    void initializeAdMob();
  }, []);

  // Status bar is owned centrally by <RootNavigator/> (route-aware), so it
  // contrasts correctly with each screen's background. No app-level
  // StatusBar / backdrop here — that black band over light screens was what
  // hid the icons on iOS.
  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <AuthHydrationGate>
          <SafeAreaProvider>
            <ThemeProvider mode="light">
              <>
                <RootNavigator />
                <FlashMessage position="top" MessageComponent={AppToastMessage} />
              </>
            </ThemeProvider>
          </SafeAreaProvider>
        </AuthHydrationGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
});

export default App;
