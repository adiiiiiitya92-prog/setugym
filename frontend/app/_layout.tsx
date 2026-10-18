import '../utils/suppressWarnings';
import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaperProvider, MD3DarkTheme, MD3LightTheme, Snackbar } from 'react-native-paper';
import { DeviceEventEmitter, StatusBar, View, Text } from 'react-native';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { GymProvider } from '../context/GymContext';
import { ToastEvent } from '../hooks/useToast';
import { getFCMTokenAsync, registerDeviceTokenWithBackend } from '../utils/notificationService';
import '../global.css';



// Sub-component to manage theme and route guards
const AppContent = () => {
  const { theme, colors, isDark } = useTheme();
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  // Floating snackbar state
  const [toast, setToast] = useState<ToastEvent | null>(null);
  const [visible, setVisible] = useState(false);

  // Dynamic status bar style based on active theme
  const statusBarStyle = theme === 'light' ? 'dark-content' : 'light-content';

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('SHOW_TOAST', (event: ToastEvent) => {
      setToast(event);
      setVisible(true);
    });
    return () => subscription.remove();
  }, []);

  // Register push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const registerPush = async () => {
        try {
          const token = await getFCMTokenAsync();
          if (token) {
            await registerDeviceTokenWithBackend(user.id, user.role, token);
          }
        } catch (e) {
          console.warn("Failed to register push token automatically:", e);
        }
      };
      registerPush();
    }
  }, [isAuthenticated, user]);

  // Safe navigation guard logic
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (user) {
      // User is authenticated, direct them to their custom portal if on root or login
      const inSuperAdmin = segments[0] === '(super-admin)';
      const inGymOwner = segments[0] === '(gym-owner)';
      const inTrainer = segments[0] === '(trainer)';
      const inMember = segments[0] === '(member)';

      if (inAuthGroup || (segments.length as number) === 0 || (segments[0] as string) === "") {
        switch (user.role) {
          case 'super-admin':
            router.replace('/(super-admin)/dashboard');
            break;
          case 'gym-owner':
            router.replace('/(gym-owner)/dashboard');
            break;
          case 'trainer':
            router.replace('/(trainer)/dashboard');
            break;
          case 'member':
            router.replace('/(member)/dashboard');
            break;
        }
      }
    }
  }, [isAuthenticated, user, segments, loading]);

  // Combine customized color styles into paper structure
  const paperTheme = isDark
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: '#6C47FF',
          secondary: '#00C896',
          background: colors.background,
          surface: colors.card,
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: '#6C47FF',
          secondary: '#00C896',
          background: colors.background,
          surface: colors.card,
        },
      };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Loading SetuGym...</Text>
      </View>
    );
  }

  // Get toast border background based on its status type
  const toastBg =
    toast?.type === 'success'
      ? '#00C896'
      : toast?.type === 'error'
      ? '#FF6B35'
      : '#6C47FF';

  return (
    <PaperProvider theme={paperTheme}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={colors.background} />
        <Slot />
        
        {/* Global Premium Alert Feedback Toast */}
        <Snackbar
          visible={visible}
          onDismiss={() => setVisible(false)}
          duration={3000}
          style={{
            backgroundColor: colors.card,
            borderLeftWidth: 5,
            borderLeftColor: toastBg,
            borderRadius: 12,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 8,
            marginBottom: insets.bottom,
          }}
          action={{
            label: 'Close',
            textColor: toastBg,
            onPress: () => setVisible(false),
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '500' }}>
            {toast?.message}
          </Text>
        </Snackbar>
      </View>
    </PaperProvider>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <GymProvider>
            <AppContent />
          </GymProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
