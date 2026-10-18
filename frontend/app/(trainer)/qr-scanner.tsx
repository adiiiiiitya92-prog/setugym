import React, { useState, useContext } from 'react';
import { View, Text, Modal, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { QRScanner } from '../../components/QRScanner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { decodeQRCodePayload } from '../../utils/qrHelper';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/dateHelper';
import { Member, AttendanceRecord } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { isBefore, parseISO } from 'date-fns';

export default function QRScannerScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { members, attendanceRecords, memberPlans, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const trainerId = user?.id || 'trainer-1';

  // Scanner Modal displays
  const [scannerActive, setScannerActive] = useState(true);
  const [scannedMember, setScannedMember] = useState<Member | null>(null);
  const [scanResultVisible, setScanResultVisible] = useState(false);
  
  // Validation status
  const [scanStatus, setScanStatus] = useState<'success' | 'expired' | 'duplicate' | 'notfound'>('success');
  const [scanMessage, setScanMessage] = useState('');

  // Kiosk Reception mode toggle
  const [kioskMode, setKioskMode] = useState(false);

  const getPlanName = (pId: string): string => {
    const plan = memberPlans.find(p => p.id === pId);
    return plan ? plan.name : "Custom Tier";
  };

  const handleScanSuccess = (qrData: string) => {
    // Parse
    const payload = decodeQRCodePayload(qrData);
    if (!payload || !payload.memberId) {
      setScanStatus('notfound');
      setScanMessage("Invalid QR payload. Access card is not recognized.");
      setScannedMember(null);
      setScanResultVisible(true);
      return;
    }

    const member = members.find(m => m.id === payload.memberId);
    
    if (!member) {
      setScanStatus('notfound');
      setScanMessage(`Client ID "${payload.memberId}" does not exist in our system.`);
      setScannedMember(null);
      setScanResultVisible(true);
      return;
    }

    // Validation 1: Expiration check
    const today = new Date();
    const expiry = parseISO(member.endDate);
    const isExpired = isBefore(expiry, today) || member.status === 'expired';

    if (isExpired) {
      setScanStatus('expired');
      setScanMessage(`This membership has expired on ${formatDate(member.endDate)}. Access is locked.`);
      setScannedMember(member);
      setScanResultVisible(true);
      return;
    }

    // Validation 2: Duplicate check-in today check
    const todayStr = formatDate(new Date(), "yyyy-MM-dd");
    const alreadyCheckedIn = attendanceRecords.some(r => r.memberId === member.id && r.date === todayStr);

    if (alreadyCheckedIn) {
      setScanStatus('duplicate');
      setScanMessage(`Client is already checked in for today.`);
      setScannedMember(member);
      setScanResultVisible(true);
      return;
    }

    // Success - Dispatch log check-in
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      memberId: member.id,
      userName: member.name,
      role: 'member',
      gymId: activeGymId,
      date: todayStr,
      checkInTime: formatDate(new Date(), "HH:mm"),
      checkOutTime: null,
      status: 'checked_in',
      scannedBy: kioskMode ? "Kiosk" : trainerId,
      method: kioskMode ? "kiosk" : "qr"
    };

    dispatch({ type: 'LOG_ATTENDANCE', payload: newRecord });
    
    setScanStatus('success');
    setScanMessage(`Attendance logged! Entry permitted.`);
    setScannedMember(member);
    setScanResultVisible(true);

    if (kioskMode) {
      // Automatically close in kiosk mode after 3 seconds to keep loop going
      setTimeout(() => {
        setScanResultVisible(false);
      }, 3000);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {scannerActive ? (
        <QRScanner
          title={kioskMode ? "Kiosk Reception Entry Mode" : "Scan Client Check-In QR"}
          onScan={handleScanSuccess}
          onClose={!kioskMode ? () => setScannerActive(false) : undefined}
        />
      ) : (
        <View className="flex-grow justify-center items-center p-8">
          <Ionicons name="camera-reverse" size={64} color="#6C47FF" className="mb-4" />
          <Text style={{ color: colors.text }} className="text-xl font-black text-center mb-2">Camera Scanner Inactive</Text>
          <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium leading-4 mb-6 max-w-[240px]">
            To resume scanning member QR cards for attendance check-ins, reactivate your camera frame below.
          </Text>
          <Button title="Reactivate Camera" onPress={() => setScannerActive(true)} className="rounded-xl px-8" />
        </View>
      )}

      {/* Reception front desk Kiosk Mode toggle buttons */}
      <View className="absolute bottom-5 left-5 right-5 flex-row gap-3">
        <TouchableOpacity
          onPress={() => {
            setKioskMode(!kioskMode);
            toast.success(kioskMode ? "Disabled Front Desk Kiosk Mode." : "Enabled Reception Kiosk self check-in mode!");
          }}
          style={{
            backgroundColor: kioskMode ? '#00C896' : 'rgba(0,0,0,0.6)',
            borderColor: kioskMode ? '#00C896' : '#FFFFFF'
          }}
          className="flex-1 py-3 border rounded-xl flex-row items-center justify-center shadow-lg active:scale-98"
        >
          <Ionicons name={kioskMode ? "lock-closed" : "keypad-outline"} size={16} color="#FFFFFF" className="mr-2" />
          <Text className="text-white font-extrabold text-xs uppercase tracking-wide">
            {kioskMode ? "Kiosk Active (Lock)" : "Front Desk Kiosk"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SCAN RESULTS ACTION OVERLAY MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={scanResultVisible}
        onRequestClose={() => setScanResultVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View 
            style={{ 
              backgroundColor: colors.card,
              borderColor: scanStatus === 'success' ? '#00C896' : scanStatus === 'duplicate' ? '#F59E0B' : '#FF6B35',
              borderWidth: 3.5 
            }} 
            className="w-full max-w-[320px] rounded-[32px] p-6 shadow-2xl items-center"
          >
            {/* Visual Header icon */}
            <View 
              style={{ 
                backgroundColor: scanStatus === 'success' ? 'rgba(0, 200, 150, 0.12)' : scanStatus === 'duplicate' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 107, 53, 0.12)' 
              }} 
              className="p-3.5 rounded-full mb-4"
            >
              <Ionicons 
                name={scanStatus === 'success' ? "checkmark-circle" : scanStatus === 'duplicate' ? "warning" : "close-circle"} 
                size={36} 
                color={scanStatus === 'success' ? '#00C896' : scanStatus === 'duplicate' ? '#F59E0B' : '#FF6B35'} 
              />
            </View>

            <Text 
              style={{ color: scanStatus === 'success' ? '#00C896' : scanStatus === 'duplicate' ? '#F59E0B' : '#FF6B35' }} 
              className="text-lg font-black uppercase tracking-wider mb-2"
            >
              {scanStatus === 'success' ? "Access Granted" : scanStatus === 'duplicate' ? "Already Checked-In" : "Access Denied"}
            </Text>

            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold text-center leading-4 mb-5">
              {scanMessage}
            </Text>

            {/* Profile Detail card representation */}
            {scannedMember && (
              <View className="items-center mb-5 w-full bg-gray-50 dark:bg-gray-800/10 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <Avatar name={scannedMember.name} uri={scannedMember.photoUrl} size={50} />
                <Text style={{ color: colors.text }} className="text-base font-black mt-2 text-center" numberOfLines={1}>
                  {scannedMember.name}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold text-center mt-0.5">
                  {getPlanName(scannedMember.planId)}
                </Text>
                <Badge status={scannedMember.status} style={{ marginTop: 6 }} />
              </View>
            )}

            {!kioskMode && (
              <Button 
                title="Dismiss Scanner Result" 
                onPress={() => setScanResultVisible(false)} 
                className="w-full rounded-xl"
                style={{ backgroundColor: scanStatus === 'success' ? '#00C896' : '#6C47FF' }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
