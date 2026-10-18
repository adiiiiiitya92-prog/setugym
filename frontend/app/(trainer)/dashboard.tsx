import React, { useState, useContext, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { formatDate } from '../../utils/dateHelper';
import { Ionicons } from '@expo/vector-icons';

export default function TrainerDashboard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { members, attendanceRecords } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const trainerId = user?.id || 'trainer-1';

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filter assigned members
  const myClients = useMemo(() => {
    return members.filter(m => m.gymId === activeGymId && m.assignedTrainerId === trainerId);
  }, [members, activeGymId, trainerId]);

  // 2. Count scans logged today by this trainer
  const todayScans = useMemo(() => {
    const todayStr = formatDate(new Date(), "yyyy-MM-dd");
    return attendanceRecords.filter(r => r.gymId === activeGymId && r.date === todayStr && r.scannedBy === trainerId).length;
  }, [attendanceRecords, activeGymId, trainerId]);

  // Seed standard upcoming sessions list
  const sessions: any[] = [];

  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    return sessions.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6C47FF" />
      }
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search clients or sessions..."
      />

      <View className="mb-6 mt-1">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
          FITNESS COACH PORTAL
        </Text>
        <Text style={{ color: colors.text }} className="text-3xl font-black tracking-tight mt-1">
          Trainer Console
        </Text>
      </View>

      {/* Stats row */}
      <View className="flex-row flex-wrap justify-between gap-4 mb-6">
        <StatCard 
          title="Assigned Clients" 
          value={myClients.length} 
          icon="people" 
          color="#6C47FF"
        />
        <StatCard 
          title="Scans Today" 
          value={todayScans} 
          icon="qr-code" 
          color="#00C896"
          subtitle="Your check-in log count"
        />
      </View>

      {/* Motivational quote board */}
      <Card style={{ backgroundColor: 'rgba(108,71,255,0.06)', borderColor: '#6C47FF', borderWidth: 1 }} className="mb-6">
        <View className="flex-row items-center mb-2">
          <Ionicons name="sparkles" size={16} color="#6C47FF" className="mr-1.5" />
          <Text style={{ color: colors.text }} className="text-xs font-black uppercase tracking-wider text-primary">Daily Inspiration</Text>
        </View>
        <Text style={{ color: colors.text }} className="text-sm font-bold italic leading-5">
          "The raw essence of a master coach is not in making exercises hard, but in making standard moves look easy and clients feel indestructible."
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold text-right mt-2 uppercase tracking-wide">— Coach Creed</Text>
      </Card>

      {/* Sessions list */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Today's Schedule Shift</Text>
      {filteredSessions.length === 0 ? (
        <Card className="items-center py-6">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No sessions scheduled.</Text>
        </Card>
      ) : (
        filteredSessions.map(item => (
          <Card key={item.id} className="mb-3 p-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="bg-primary/10 p-2.5 rounded-xl mr-3">
                <Ionicons name="time" size={16} color="#6C47FF" />
              </View>
              <View>
                <Text style={{ color: colors.text }} className="text-sm font-black">{item.name}</Text>
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-0.5">{item.goal}</Text>
              </View>
            </View>
            <View className="bg-primary px-3 py-1 rounded-lg">
              <Text className="text-white font-extrabold text-[10px]">{item.time}</Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
