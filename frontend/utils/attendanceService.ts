import { GymQRPayload } from './attendanceHelper';
import { AttendanceRecord } from '../types';
import { API_BASE_URL } from './apiConfig';

const BASE_URL = `${API_BASE_URL}/attendance`;


/**
 * Sends a check-in request to the backend.
 * Falls back to local verification if the server is offline/unavailable.
 */
export const checkInMember = async (
  userId: string,
  userName: string,
  role: 'member' | 'trainer',
  gymId: string,
  userLatitude: number,
  userLongitude: number,
  qrPayload: GymQRPayload
): Promise<{ success: boolean; record?: AttendanceRecord; error?: string }> => {
  try {
    const response = await fetch(`${BASE_URL}/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userName,
        role,
        gymId,
        userLatitude,
        userLongitude,
        qrLatitude: qrPayload.latitude,
        qrLongitude: qrPayload.longitude,
        qrGeneratedAt: qrPayload.generatedAt,
        qrToken: qrPayload.token
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Check-in failed.' };
    }
    return { success: true, record: data.record };
  } catch (err) {
    console.warn("API Server unavailable, falling back to local simulation:", err);
    // Return success to signify screen fallback logic can handle it in the global context
    return { success: true };
  }
};

/**
 * Sends a check-out request to the backend.
 * Falls back to local verification if the server is offline/unavailable.
 */
export const checkOutMember = async (
  userId: string
): Promise<{ success: boolean; record?: AttendanceRecord; error?: string }> => {
  try {
    const response = await fetch(`${BASE_URL}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Check-out failed.' };
    }
    return { success: true, record: data.record };
  } catch (err) {
    console.warn("API Server unavailable, falling back to local simulation:", err);
    return { success: true };
  }
};

/**
 * Fetches today's attendance logs from the server.
 */
export const getTodayAttendance = async (
  gymId?: string,
  role?: 'member' | 'trainer'
): Promise<{ success: boolean; records?: AttendanceRecord[]; error?: string }> => {
  try {
    let url = `${BASE_URL}/today`;
    const params: string[] = [];
    if (gymId) params.push(`gymId=${gymId}`);
    if (role) params.push(`role=${role}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to fetch logs.' };
    }
    return { success: true, records: data.records };
  } catch (err) {
    return { success: false, error: 'API Server offline.' };
  }
};
