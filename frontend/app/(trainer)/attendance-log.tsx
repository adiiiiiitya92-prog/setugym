import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { AttendanceRow } from '../../components/AttendanceRow';
import { useSearch } from '../../hooks/useSearch';

export default function AttendanceLogScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { attendanceRecords, members } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // 1. Filter gym check-ins
  const gymRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.gymId === activeGymId);
  }, [attendanceRecords, activeGymId]);

  // Map check-ins with member details
  const decoratedRecords = useMemo(() => {
    return gymRecords.map(rec => {
      const member = members.find(m => m.id === rec.memberId);
      return {
        ...rec,
        memberName: member ? member.name : "Unknown Member"
      };
    });
  }, [gymRecords, members]);

  // 2. Search query filtration
  const searchedRecords = useSearch(decoratedRecords, searchQuery, ['memberName', 'memberId', 'date']);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search check-ins by member name or date..."
      />

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
            <Text className="text-4xl mb-3">📋</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Records Logged</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
              No membership entry check-ins have been recorded under your gym branch yet.
            </Text>
          </Card>
        }
      />
    </View>
  );
}
