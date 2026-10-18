import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Share } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { StatCard } from '../../components/ui/StatCard';
import { AttendanceRow } from '../../components/AttendanceRow';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { formatDate } from '../../utils/dateHelper';
import { Ionicons } from '@expo/vector-icons';
import { subDays, format, parseISO } from 'date-fns';

export default function AttendanceScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { attendanceRecords, members, trainers } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  // Date & Role selection state
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'trainer'>('all');

  // 1. Filter gym branch members and check-ins
  const gymMembers = useMemo(() => members.filter(m => m.gymId === activeGymId), [members, activeGymId]);
  
  const dailyRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.gymId === activeGymId && r.date === selectedDate);
  }, [attendanceRecords, activeGymId, selectedDate]);

  // Map check-ins with member/trainer details
  const decoratedRecords = useMemo(() => {
    return dailyRecords.map(rec => {
      if (rec.role === 'trainer') {
        const trainer = trainers.find(t => t.id === rec.memberId);
        return {
          ...rec,
          memberName: trainer ? trainer.name : rec.userName || "Unknown Trainer"
        };
      } else {
        const member = members.find(m => m.id === rec.memberId);
        return {
          ...rec,
          memberName: member ? member.name : rec.userName || "Unknown Member"
        };
      }
    });
  }, [dailyRecords, members, trainers]);

  // Filter records by selected role
  const filteredRecords = useMemo(() => {
    if (roleFilter === 'all') return decoratedRecords;
    return decoratedRecords.filter(r => r.role === roleFilter);
  }, [decoratedRecords, roleFilter]);

  // 2. Search query filtration
  const searchedRecords = useSearch(filteredRecords, searchQuery, ['memberName', 'memberId']);

  // Dynamic daily stats
  const totalGymMembersCount = gymMembers.length;
  const presentCount = dailyRecords.filter(r => r.role === 'member').length;
  const absentCount = totalGymMembersCount - presentCount > 0 ? totalGymMembersCount - presentCount : 0;
  const attendancePercentage = totalGymMembersCount > 0 
    ? Math.round((presentCount / totalGymMembersCount) * 100) 
    : 0;

  // Simple date quick tabs selectors (Today, Yesterday, 2 days ago, 3 days ago)
  const quickDates = useMemo(() => {
    return [
      { label: "Today", dateStr: format(new Date(), "yyyy-MM-dd") },
      { label: "Yesterday", dateStr: format(subDays(new Date(), 1), "yyyy-MM-dd") },
      { label: "2d Ago", dateStr: format(subDays(new Date(), 2), "yyyy-MM-dd") },
      { label: "3d Ago", dateStr: format(subDays(new Date(), 3), "yyyy-MM-dd") },
    ];
  }, []);

  const handleExportCSV = async () => {
    try {
      let csvContent = "CheckIn ID,Member ID,Member Name,Date,CheckIn Time,Scanned By,Method\n";
      decoratedRecords.forEach(r => {
        csvContent += `${r.id},${r.memberId},"${r.memberName}",${r.date},${r.checkInTime},"${r.scannedBy}",${r.method}\n`;
      });

      await Share.share({
        message: csvContent,
        title: `SetuGym Attendance Export ${selectedDate}`
      });
      toast.success("CSV file exported successfully!");
    } catch (e) {
      toast.error("Export canceled or failed.");
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      {/* Search and export controls */}
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <SearchBar 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search checked-in members by name..."
          />
        </View>
        <TouchableOpacity
          onPress={handleExportCSV}
          className="p-3 bg-secondary/10 rounded-2xl mb-4"
        >
          <Ionicons name="download-outline" size={20} color="#00C896" />
        </TouchableOpacity>
      </View>

      {/* Role selection tabs */}
      <View className="flex-row mb-4 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
        {(['all', 'member', 'trainer'] as const).map((role) => {
          const isSelected = roleFilter === role;
          const label = role === 'all' ? 'All Roles' : role === 'member' ? 'Members' : 'Trainers';
          return (
            <TouchableOpacity
              key={role}
              onPress={() => setRoleFilter(role)}
              style={{
                backgroundColor: isSelected ? '#6C47FF' : 'transparent',
              }}
              className="flex-1 py-2 rounded-lg items-center"
            >
              <Text
                style={{
                  color: isSelected ? '#FFFFFF' : colors.textSecondary,
                }}
                className="text-[9px] font-extrabold uppercase tracking-wide"
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date Quick selection tabs */}
      <View className="flex-row mb-5 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
        {quickDates.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          return (
            <TouchableOpacity
              key={item.dateStr}
              onPress={() => setSelectedDate(item.dateStr)}
              style={{
                backgroundColor: isSelected ? '#6C47FF' : 'transparent',
              }}
              className="flex-1 py-2.5 rounded-lg items-center"
            >
              <Text
                style={{
                  color: isSelected ? '#FFFFFF' : colors.textSecondary,
                }}
                className="text-[9px] font-extrabold uppercase tracking-wide"
              >
                {item.label}
              </Text>
              <Text
                style={{
                  color: isSelected ? '#FFFFFF' : colors.textSecondary,
                }}
                className="text-[9px] font-semibold mt-0.5"
              >
                {formatDate(item.dateStr, "dd MMM")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Daily Metrics */}
      <View className="flex-row flex-wrap justify-between gap-4 mb-6">
        <StatCard 
          title="Present" 
          value={presentCount} 
          icon="checkmark-done" 
          color="#00C896"
        />
        <StatCard 
          title="Absent" 
          value={absentCount} 
          icon="close" 
          color="#FF6B35"
        />
        <StatCard 
          title="Attendance Rate" 
          value={`${attendancePercentage}%`} 
          icon="pulse" 
          color="#6C47FF"
          subtitle="Of total gym members roster"
        />
      </View>

      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">
        Attendance Logs ({searchedRecords.length})
      </Text>

      {/* Check-ins list */}
      <FlatList
        data={searchedRecords}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => (
          <AttendanceRow
            record={item}
            memberName={item.memberName}
          />
        )}
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">📅</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Records Logged</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
              No members have checked in or scanned their QR cards on this date.
            </Text>
          </Card>
        }
      />
    </View>
  );
}
