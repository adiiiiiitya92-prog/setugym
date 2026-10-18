import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { API_BASE_URL } from './apiConfig';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

/**
 * Safely access expo-notifications without crashing Expo Go
 * (Remote push native modules were removed from Expo Go starting in SDK 53).
 */
function getNotificationsModule(): typeof import('expo-notifications') | null {
  if (isExpoGo) {
    return null;
  }
  try {
    return require('expo-notifications');
  } catch (e) {
    console.warn('[Push Notifications] Native module not available in this environment:', e);
    return null;
  }
}

// Configure how notifications are handled when the app is open (foreground)
const notificationsInstance = getNotificationsModule();
if (notificationsInstance?.setNotificationHandler) {
  try {
    notificationsInstance.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[Push Notifications] Could not set notification handler:', e);
  }
}

/**
 * Registers device for push notifications and returns permissions status
 */
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  if (Platform.OS === 'web' || isExpoGo) {
    return false;
  }

  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return false;
    }

    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C47FF',
      });
    }

    return true;
  } catch (err) {
    console.warn('[Notifications] Error registering notifications:', err);
    return false;
  }
}

/**
 * Gets the actual native FCM device push token (only on physical devices and dev builds)
 */
export async function getFCMTokenAsync(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice || isExpoGo) {
    if (isExpoGo) {
      console.log('[Push Notifications] Expo Go detected: Remote push notifications require a Development Build. Skipping FCM token.');
    }
    return null;
  }

  const hasPermission = await registerForPushNotificationsAsync();
  if (!hasPermission) {
    return null;
  }

  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return null;
  }

  try {
    const token = (await Notifications.getDevicePushTokenAsync()).data;
    console.log('[Push Notifications] Native FCM Device Push Token:', token);
    return token;
  } catch (error) {
    console.error('[Push Notifications] Error getting native device push token:', error);
    return null;
  }
}

/**
 * Registers the device token with the backend server
 */
export async function registerDeviceTokenWithBackend(
  userId: string,
  role: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        role,
        token
      })
    });

    if (response.ok) {
      console.log(`[Push Notifications] Registered token with backend for user: ${userId}`);
      return true;
    } else {
      console.warn('[Push Notifications] Failed to register token with backend status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Push Notifications] Error registering token with backend:', error);
    return false;
  }
}

/**
 * Simulates firing a push notification locally on the device (minimized or foreground)
 */
export async function triggerLocalNotification({
  title,
  body,
  data = {},
  priority = 'normal'
}: {
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'normal' | 'urgent';
}) {
  const Notifications = getNotificationsModule();
  if (Platform.OS === 'web' || !Notifications) {
    console.log(`[Notification (${priority})]: ${title} - ${body}`);
    return null;
  }

  try {
    const isGranted = await registerForPushNotificationsAsync();
    if (!isGranted) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${priority === 'urgent' ? '🚨 URGENT: ' : ''}${title}`,
        body,
        data,
        sound: true,
        badge: 1,
      },
      trigger: null,
    });

    return id;
  } catch (err) {
    console.warn('[Local Notification] Error scheduling:', err);
    return null;
  }
}
