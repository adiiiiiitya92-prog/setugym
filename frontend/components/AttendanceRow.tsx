import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatDate } from '../utils/dateHelper';
import { AttendanceRecord } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface AttendanceRowProps {
  record: AttendanceRecord;
  memberName: string;
}

export const AttendanceRow: React.FC<AttendanceRowProps> = ({
  record,
  memberName
}) => {
  const { colors } = useTheme();

  const displayStatus = record.status || 'checked_in';
  const durationText = record.duration
    ? record.duration >= 60
      ? `${Math.floor(record.duration / 60)}h ${record.duration % 60}m`
      : `${record.duration}m`
    : 'Active';

  return (
    <Card className="mb-3 p-4">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 mr-2">
          <Text style={{ color: colors.text }} className="text-base font-extrabold" numberOfLines={1}>
            {memberName}
          </Text>
          <View className="flex-row items-center mt-1.5 flex-wrap">
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} className="mr-1" />
            <Text style={{ color: colors.textSecondary }} className="text-[11px] font-semibold">
              In: {record.checkInTime}
              {record.checkOutTime ? ` | Out: ${record.checkOutTime}` : ''}
              {record.duration ? ` (${durationText})` : ' (Active)'}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Badge status={displayStatus === 'checked_in' ? 'checked_in' : 'checked_out'} />
          <View className="flex-row items-center mt-1.5">
            <Ionicons 
              name={record.method === 'qr' ? 'qr-code-outline' : 'keypad-outline'} 
              size={11} 
              color={colors.textSecondary} 
              className="mr-1" 
            />
            <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">
              {record.method}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
};
export default AttendanceRow;
