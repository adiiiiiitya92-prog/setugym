# Guide: Production Setup for Firebase Cloud Messaging (FCM)

This guide walks you through migrating the simulated push notification engine to Firebase Cloud Messaging (FCM) for native iOS and Android delivery.

---

## Part 1: Firebase Console Configuration

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project**, enter a name (e.g., `SetuGym Platform`), and click **Continue**.
3. Choose whether to enable Google Analytics, then click **Create Project**.

### 2. Configure Android App
1. Inside your Firebase project, click the **Android Icon** to add an app.
2. Enter the Android Package Name (matches `android.package` in your `app.json`, e.g., `com.setusolution.gymapp`).
3. (Optional) Enter the SHA-1 signing certificate fingerprint.
   * *Tip*: Retrieve this by running `npx expo credentials:signing` or `./gradlew signingReport` in your android directory.
4. Click **Register App**.
5. Download the `google-services.json` file and place it in the root directory of your Expo project (`d:/gym/frontend/google-services.json`).

### 3. Configure iOS App
1. Click **Add App** and select the **iOS Icon**.
2. Enter the iOS Bundle ID (matches `ios.bundleIdentifier` in your `app.json`, e.g., `com.setusolution.gymapp`).
3. Click **Register App**.
4. Download the `GoogleService-Info.plist` file and place it in the root directory of your Expo project (`d:/gym/frontend/GoogleService-Info.plist`).

---

## Part 2: Native Push Credentials & Certificates

### 1. iOS Credentials (APNs)
To send notifications to Apple devices, Firebase needs permission to communicate with Apple Push Notification service (APNs):
1. Log in to your [Apple Developer Account](https://developer.apple.com/).
2. Navigate to **Certificates, Identifiers & Profiles** > **Keys**.
3. Click the **+** (plus) icon to create a new key.
4. Select **Apple Push Notifications service (APNs)**, enter a name, and click **Continue** > **Register**.
5. Download the `.p8` key file. Note your **Key ID** and **Team ID**.
6. Go back to Firebase Console > Project Settings > **Cloud Messaging** tab.
7. Under **Apple app share configuration**, upload your `.p8` key file, and input the Key ID and Team ID.

### 2. Android Credentials
For Android, Expo handles the background notification channels automatically. If building custom standalone APKs:
1. Ensure the Google Play Services configuration is enabled.
2. When running `eas build --platform android`, EAS will automatically set up credentials on Google Cloud and link them to your Expo app.

---

## Part 3: App Configuration (app.json)

Update your `frontend/app.json` file to reference the downloaded Firebase credentials and configure plugins:

```json
{
  "expo": {
    "name": "SetuGym",
    "slug": "setugym",
    "ios": {
      "bundleIdentifier": "com.setusolution.gymapp",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.setusolution.gymapp",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6C47FF",
          "sounds": [
            "./assets/notification-sound.wav"
          ]
        }
      ]
    ]
  }
}
```

---

## Part 4: Production Server Integration (firebase-admin)

Replace the simulated FCM triggers in your Node.js backend with the official Google `firebase-admin` SDK:

### 1. Install Dependencies
In your backend directory (`d:/gym/backend`), install the Firebase Admin SDK:
```bash
npm install firebase-admin --save
```

### 2. Generate Service Account Key JSON
1. Firebase Console > Project Settings > **Service Accounts** tab.
2. Click **Generate New Private Key**, then click **Generate Key**.
3. Save the downloaded JSON file as `service-account-file.json` in your backend root folder.

### 3. Implement Delivery Code
Update your backend Route (`routes/notifications.js`) to dispatch the FCM messages:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../service-account-file.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Production send notification handler
async function sendFCMPushNotification({ title, body, audience, priority, relatedId }) {
  // Retrieve target FCM tokens from your database based on audience role
  // For example: const tokens = await db.users.find({ role: audience }).map(u => u.fcmToken);
  const registrationTokens = ['fcm-token-1', 'fcm-token-2']; // Placeholder

  if (registrationTokens.length === 0) return;

  const message = {
    notification: {
      title,
      body
    },
    data: {
      noticeId: relatedId || ''
    },
    android: {
      notification: {
        sound: 'default',
        icon: 'stock_ticker_update',
        color: '#6C47FF'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    },
    tokens: registrationTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} FCM push messages.`);
    return {
      success: response.successCount,
      failed: response.failureCount
    };
  } catch (error) {
    console.error('FCM Multicast error:', error);
    throw error;
  }
}
```

---

## Part 5: Production Client Setup (Retrieving Device Token)

Configure your Expo frontend to request permissions and save the actual FCM token to your backend database:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return null;
  }

  // Get project ID from expo config
  const projectId = 
    Constants.expoConfig?.extra?.eas?.projectId ?? 
    Constants.easConfig?.projectId;

  // Retrieve actual FCM Push Token
  const token = (await Notifications.getDevicePushTokenAsync()).data;
  console.log('Actual FCM Device Push Token:', token);

  // Send this token to your backend server to register the user device
  // await fetch('http://your-server-ip:5000/users/register-token', {
  //   method: 'POST',
  //   body: JSON.stringify({ userId: 'current-user-id', token })
  // });

  return token;
}
```
