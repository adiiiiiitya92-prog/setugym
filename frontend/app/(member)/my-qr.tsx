import React, { useContext } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { QRCodeCard } from '../../components/QRCodeCard';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/dateHelper';
import { AttendanceRecord } from '../../types';

export default function MyQRScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { members, attendanceRecords, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const memberId = user?.id || 'member-john';

  const member = members.find(m => m.id === memberId);

  // Self check-in simulation
  const handleSelfCheckIn = () => {
    if (!member) return;

    // Check duplicate check-in today
    const todayStr = formatDate(new Date(), "yyyy-MM-dd");
    const alreadyCheckedIn = attendanceRecords.some(r => r.memberId === member.id && r.date === todayStr);

    if (alreadyCheckedIn) {
      toast.warning("Duplicate check-in warning! You have already registered your attendance today.");
      return;
    }

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
      scannedBy: "Self Check-In",
      method: "qr"
    };

    dispatch({ type: 'LOG_ATTENDANCE', payload: newRecord });
    toast.success("Successfully registered self check-in attendance!");
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}
    >
      <View className="mb-6 items-center">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
          ACCESS PASS
        </Text>
        <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight mt-1">
          Scan QR Code
        </Text>
      </View>

      {member ? (
        <QRCodeCard
          memberId={member.id}
          memberName={member.name}
          gymId={activeGymId}
          expiryDate={member.endDate}
          onSelfCheckIn={handleSelfCheckIn}
        />
      ) : (
        <Card className="items-center py-10">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Loading membership card details...</Text>
        </Card>
      )}
    </ScrollView>
  );
}
