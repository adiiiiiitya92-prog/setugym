import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/dateHelper';
import { AttendanceRecord } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from 'date-fns';

export default function MemberAttendanceScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { attendanceRecords } = gymContext;

  const memberId = user?.id || 'member-john';

  // Toggle view: calendar | list
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch member check-ins
  const ownRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.memberId === memberId);
  }, [attendanceRecords, memberId]);

  // Streak calculation (mocked 5 days consecutive)
  const streakCount = ownRecords.length > 0 ? 5 : 0;
  
  // Calculate attendance % this month
  const monthlyRate = useMemo(() => {
    const daysInMonth = 30; // standard approximation
    const thisMonthStr = format(new Date(), "yyyy-MM");
    const count = ownRecords.filter(r => r.date.startsWith(thisMonthStr)).length;
    return Math.round((count / daysInMonth) * 100);
  }, [ownRecords]);

  // Generate calendar grid days for current month
  const calendarDays = useMemo(() => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return eachDayOfInterval({ start, end });
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      {/* Toggles */}
      <View className="flex-row justify-between items-center mb-5">
        <View>
          <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
            LOGS HISTORIES
          </Text>
          <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight mt-1">
            My Attendance
          </Text>
        </View>

        <View className="flex-row bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
          <TouchableOpacity
            onPress={() => setViewMode('calendar')}
            className={`p-2 rounded-md ${viewMode === 'calendar' ? 'bg-primary' : 'transparent'}`}
          >
            <Ionicons name="grid-outline" size={14} color={viewMode === 'calendar' ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-primary' : 'transparent'}`}
          >
            <Ionicons name="list-outline" size={14} color={viewMode === 'list' ? '#FFFFFF' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Aggregate metrics */}
      <Card className="mb-6 flex-row justify-between p-4">
        <View className="items-center flex-1 border-r border-gray-100 dark:border-gray-800 py-1">
          <Text className="text-2xl font-black text-primary">{streakCount} Days</Text>
          <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase mt-1 tracking-wider">Attendance Streak</Text>
        </View>
        <View className="items-center flex-1 py-1">
          <Text className="text-2xl font-black text-secondary">{monthlyRate}%</Text>
          <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase mt-1 tracking-wider">Monthly Rate</Text>
        </View>
      </Card>

      {/* Calendar Grid Mode */}
      {viewMode === 'calendar' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card className="p-4 mb-4">
            <Text style={{ color: colors.text }} className="text-sm font-black mb-4 text-center">
              {format(new Date(), "MMMM yyyy")}
            </Text>
            
            <View className="flex-row flex-wrap gap-2.5 justify-start">
              {calendarDays.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const attended = ownRecords.some(r => r.date === dayStr);
                
                return (
                  <View
                    key={dayStr}
                    style={{
                      backgroundColor: attended ? '#00C896' : colors.border,
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: attended ? '#FFFFFF' : colors.text,
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    >
                      {format(day, "d")}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </ScrollView>
      )}

      {/* Historical List Mode */}
      {viewMode === 'list' && (
        <FlatList
          data={ownRecords}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <Card className="mb-3 p-4 flex-row justify-between items-center">
              <View>
                <Text style={{ color: colors.text }} className="text-sm font-black">
                  {formatDate(item.date, "PP")}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-0.5 font-semibold">
                  Scanned in at {item.checkInTime} by {item.scannedBy}
                </Text>
              </View>
              <Badge status="Present" />
            </Card>
          )}
          ListEmptyComponent={
            <Card className="items-center py-10">
              <Text className="text-4xl mb-3">📅</Text>
              <Text style={{ color: colors.text }} className="text-base font-bold">No Records Found</Text>
            </Card>
          }
        />
      )}
    </View>
  );
}
