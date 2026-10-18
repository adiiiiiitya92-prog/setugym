import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { QRScanner } from '../../components/QRScanner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../hooks/useToast';
import { decodeGymQRPayload, calculateHaversineDistance } from '../../utils/attendanceHelper';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceRecord } from '../../types';

export default function MemberScanAttendanceScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { attendanceRecords, dispatch } = gymContext;

  const memberId = user?.id || 'member-john';
  const memberName = user?.name || 'John Member';

  const [scannerActive, setScannerActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  // Success Overlay State
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successType, setSuccessType] = useState<'check_in' | 'check_out'>('check_in');
  const [successGymName, setSuccessGymName] = useState('');
  const [successTime, setSuccessTime] = useState('');
  const [successDuration, setSuccessDuration] = useState('');

  const handleScanGymQR = async (qrData: string) => {
    // 1. Decode QR payload
    const payload = decodeGymQRPayload(qrData);
    if (!payload) {
      toast.error("Invalid QR payload! Please scan the official reception QR code.");
      return;
    }

    setLoading(true);
    setLoadingText("Checking location boundaries...");

    try {
      // 2. Validate token expiration (10 minutes)
      const generatedTime = new Date(payload.generatedAt).getTime();
      const nowTime = new Date().getTime();
      const elapsedMins = (nowTime - generatedTime) / (1000 * 60);

      if (elapsedMins > 10 || elapsedMins < -1) {
        toast.error("This QR code is expired. Ask the front desk for a fresh display.");
        setLoading(false);
        return;
      }

      // 3. Request location permission and validate geofence distance
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error("Location permission denied. GPS access is required to verify check-in.");
        setLoading(false);
        return;
      }

      const currentLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const distance = calculateHaversineDistance(
        currentLoc.coords.latitude,
        currentLoc.coords.longitude,
        payload.latitude,
        payload.longitude
      );

      if (distance > 100) {
        toast.error(`Distance check failed! You are ${Math.round(distance)}m away from the reception desk.`);
        setLoading(false);
        return;
      }

      // 4. Log check-in vs check-out check
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const activeRecord = attendanceRecords.find(
        r => r.memberId === memberId && r.date === todayStr && r.status === 'checked_in'
      );

      const nowTimeStr = format(new Date(), "HH:mm");

      if (activeRecord) {
        // Attempt Check-out: Must stay at least 30 minutes
        const [checkInHour, checkInMin] = activeRecord.checkInTime.split(':').map(Number);
        const checkInDate = new Date();
        checkInDate.setHours(checkInHour, checkInMin, 0, 0);

        const now = new Date();
        const durationMins = Math.floor((now.getTime() - checkInDate.getTime()) / (1000 * 60));

        if (durationMins < 30) {
          const remaining = 30 - durationMins;
          toast.error(`⏳ You must stay at least 30 minutes before checking out. ${remaining} minutes remaining.`);
          setLoading(false);
          return;
        }

        // Valid Check-out: Update record
        const updatedRecord: AttendanceRecord = {
          ...activeRecord,
          checkOutTime: nowTimeStr,
          status: 'checked_out',
          duration: durationMins
        };

        dispatch({ type: 'UPDATE_ATTENDANCE', payload: updatedRecord });

        const hours = Math.floor(durationMins / 60);
        const mins = durationMins % 60;
        const durationString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        setSuccessType('check_out');
        setSuccessGymName(payload.gymName);
        setSuccessTime(nowTimeStr);
        setSuccessDuration(durationString);
        setSuccessModalVisible(true);
        setScannerActive(false);
      } else {
        // Double check-in check: If they are already checked out for today, let them check in again,
        // but prevent double check-in if they currently have a check-in active (handled above).
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}`,
          memberId: memberId,
          userName: memberName,
          role: 'member',
          gymId: payload.gymId,
          date: todayStr,
          checkInTime: nowTimeStr,
          checkOutTime: null,
          status: 'checked_in',
          scannedBy: "Self QR",
          method: "qr"
        };

        dispatch({ type: 'LOG_ATTENDANCE', payload: newRecord });

        setSuccessType('check_in');
        setSuccessGymName(payload.gymName);
        setSuccessTime(nowTimeStr);
        setSuccessModalVisible(true);
        setScannerActive(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Verification system encountered a location checking issue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {scannerActive && !loading ? (
        <QRScanner
          title="Scan Gym Reception QR"
          onScan={handleScanGymQR}
        />
      ) : (
        <View className="flex-grow justify-center items-center p-8">
          {loading ? (
            <View className="items-center">
              <ActivityIndicator size="large" color="#6C47FF" />
              <Text style={{ color: colors.text }} className="text-base font-bold mt-4">{loadingText}</Text>
            </View>
          ) : (
            <View className="items-center">
              <Ionicons name="camera-reverse" size={64} color="#6C47FF" className="mb-4" />
              <Text style={{ color: colors.text }} className="text-xl font-black text-center mb-2">QR Scanner Stopped</Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium leading-4 mb-6 max-w-[240px]">
                To log your entry or exit boundary check-ins, reactivate your camera frame below.
              </Text>
              <Button title="Open Camera Scanner" onPress={() => setScannerActive(true)} className="rounded-xl px-8" />
            </View>
          )}
        </View>
      )}

      {/* CHECK-IN/OUT SUCCESS SCREEN MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 p-6">
          <Card 
            style={{ 
              borderColor: '#00C896',
              borderWidth: 3.5,
              backgroundColor: colors.card
            }} 
            className="w-full max-w-[320px] rounded-[32px] p-6 shadow-2xl items-center"
          >
            <View className="p-3.5 bg-emerald-500/12 rounded-full mb-4">
              <Ionicons name="checkmark-circle" size={48} color="#00C896" />
            </View>

            <Text style={{ color: '#00C896' }} className="text-xl font-black uppercase tracking-wider mb-2">
              {successType === 'check_in' ? "Checked In!" : "Checked Out!"}
            </Text>

            <Text style={{ color: colors.text }} className="text-base font-extrabold text-center mb-1">
              {successGymName}
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold text-center mb-5">
              {successType === 'check_in' 
                ? `✅ Checked In successfully at ${successTime}` 
                : `✅ Checked Out successfully at ${successTime}`
              }
            </Text>

            {successType === 'check_out' && (
              <View className="bg-primary/10 w-full py-3 rounded-2xl mb-5 border border-primary/20">
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-black uppercase tracking-wider text-center">Session Duration</Text>
                <Text style={{ color: '#6C47FF' }} className="text-lg font-black text-center mt-0.5">{successDuration}</Text>
              </View>
            )}

            <Button 
              title="Got it!" 
              onPress={() => {
                setSuccessModalVisible(false);
                setScannerActive(true);
              }} 
              className="w-full rounded-xl"
              style={{ backgroundColor: '#00C896' }}
            />
          </Card>
        </View>
      </Modal>
    </View>
  );
}
