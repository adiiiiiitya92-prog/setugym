import { LogBox } from 'react-native';

// Intercept console.error to downgrade known Expo Go limitation messages
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args
    .map((arg) => (typeof arg === 'string' ? arg : arg?.message || ''))
    .join(' ');

  if (
    msg.includes('expo-notifications: Android Push notifications') ||
    msg.includes('ExpoMediaLibraryNext')
  ) {
    // Downgrade to subtle log so it doesn't trigger RedBox/Error overlay
    console.log('[Expo Go Notice]:', msg);
    return;
  }
  originalConsoleError(...args);
};

// Ignore in LogBox
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  "Cannot find native module 'ExpoMediaLibraryNext'",
  'Due to changes in Androids permission requirements, Expo Go can no longer provide full access to the media library',
]);
