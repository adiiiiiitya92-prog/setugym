import { Platform } from 'react-native';

// ==========================================
// BACKEND SERVER IP CONFIGURATION
// ==========================================
// Replace this with your computer's local IP address (e.g. '192.168.1.100')
// to allow a physical device (APK build) to reach the server.
// If the app runs on a simulator or web, it falls back to 'localhost'.
export const BACKEND_IP = '10.225.72.203'; 

export const API_BASE_URL = Platform.OS === 'android' || Platform.OS === 'ios'
  ? `http://${BACKEND_IP}:5001`
  : 'http://localhost:5001';
