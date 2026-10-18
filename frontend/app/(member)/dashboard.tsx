import React, { useState, useContext, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/dateHelper';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, parseISO } from 'date-fns';

export default function MemberDashboard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { members, memberPlans, attendanceRecords, notices, workoutPlans } = gymContext;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const memberId = user?.id || 'member-john';

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  }, []);

  // 1. Fetch current member
  const member = useMemo(() => members.find(m => m.id === memberId), [members, memberId]);

  // 2. Fetch membership plan details
  const plan = useMemo(() => {
    if (!member) return null;
    return memberPlans.find(p => p.id === member.planId);
  }, [member, memberPlans]);

  // 3. Compute membership progress metrics
  const progressRatio = useMemo(() => {
    if (!member || !plan) return 0;
    const start = parseISO(member.startDate);
    const end = parseISO(member.endDate);
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(new Date(), start);
    if (total <= 0) return 0;
    const ratio = (elapsed / total);
    return ratio > 1 ? 1 : ratio < 0 ? 0 : ratio;
  }, [member, plan]);

  const daysRemaining = useMemo(() => {
    if (!member) return 0;
    const diff = differenceInDays(parseISO(member.endDate), new Date());
    return diff > 0 ? diff : 0;
  }, [member]);

  // 4. Fetch own check-in logs
  const ownRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.memberId === memberId).slice(0, 5);
  }, [attendanceRecords, memberId]);

  // 5. Fetch announcements posted by owner
  const gymNotices = useMemo(() => {
    return notices.filter(n => n.gymId === activeGymId && (n.audience === 'everyone' || n.audience === 'members'));
  }, [notices, activeGymId]);

  // 6. Fetch assigned workout splits
  const assignedWorkout = useMemo(() => {
    return workoutPlans.find(w => w.assignedMemberId === memberId);
  }, [workoutPlans, memberId]);

  // 7. Streak count logic (consecutive attendance logs)
  const streakCount = useMemo(() => {
    // Simple streak calculation (mocking static 5-day streak for premium demo experience)
    return ownRecords.length > 0 ? 5 : 0;
  }, [ownRecords]);

  // Filters bulletins by search query
  const filteredNotices = useMemo(() => {
    if (!searchQuery) return gymNotices;
    return gymNotices.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.body.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [gymNotices, searchQuery]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C47FF" />
      }
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search gym notices or classes..."
      />

      {/* Welcome Streak card */}
      <View className="mb-6 mt-1 flex-row justify-between items-center">
        <View>
          <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
            WELCOME BACK
          </Text>
          <Text style={{ color: colors.text }} className="text-3xl font-black tracking-tight mt-1">
            Hey, {member?.name || "Athlete"}!
          </Text>
        </View>
        
        {streakCount > 0 && (
          <View className="bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-full flex-row items-center">
            <Text className="text-lg mr-1.5">🔥</Text>
            <Text className="text-orange-500 font-extrabold text-xs">
              {streakCount} Day Streak
            </Text>
          </View>
        )}
      </View>

      {/* Membership expiry card with progress sliders */}
      {member && plan && (
        <Card className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">Active subscription</Text>
              <Text style={{ color: colors.text }} className="text-base font-black mt-0.5">{plan.name}</Text>
            </View>
            <Badge status={member.status} />
          </View>

          {/* Progress bar container */}
          <View className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-3 overflow-hidden">
            <View 
              style={{ 
                width: `${Math.round(progressRatio * 100)}%`, 
                backgroundColor: daysRemaining <= 5 ? '#FF6B35' : '#6C47FF' 
              }} 
              className="h-full rounded-full" 
            />
          </View>

          <View className="flex-row justify-between">
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">
              {daysRemaining} Days Remaining
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">
              Expires {formatDate(member.endDate)}
            </Text>
          </View>
        </Card>
      )}

      {/* Grid of indicators */}
      <View className="flex-row flex-wrap justify-between gap-4 mb-6">
        <TouchableOpacity
          onPress={() => router.push('/(member)/attendance')}
          className="flex-1 min-w-[45%]"
        >
          <StatCard 
            title="My Attendance" 
            value={`${ownRecords.length} check-ins`} 
            icon="calendar" 
            color="#00C896"
            subtitle="View check-in history"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(member)/payments')}
          className="flex-1 min-w-[45%]"
        >
          <StatCard 
            title="Billing status" 
            value="All Settled" 
            icon="receipt" 
            color="#FF6B35"
            subtitle="View invoices portal"
          />
        </TouchableOpacity>
      </View>

      {/* Today's Workout preview */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Today's Exercises split</Text>
      <Card className="mb-6 p-4">
        {assignedWorkout ? (
          <View>
            <View className="flex-row justify-between items-center mb-3">
              <Text style={{ color: colors.text }} className="text-sm font-extrabold">{assignedWorkout.title}</Text>
              <TouchableOpacity onPress={() => router.push('/(member)/workout-plan')} className="bg-primary/10 px-3.5 py-1.5 rounded-lg">
                <Text className="text-primary font-bold text-[10px] uppercase">Open split</Text>
              </TouchableOpacity>
            </View>
            {/* List first 2 exercises */}
            <View className="space-y-1">
              {Object.values(assignedWorkout.schedule)[0]?.slice(0, 2).map((ex, idx) => (
                <Text key={idx} style={{ color: colors.textSecondary }} className="text-xs font-semibold leading-5 mt-1">
                  🏋️‍♂️ {ex.name} — <Text className="text-primary font-bold">{ex.sets} sets x {ex.reps}</Text>
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <View className="items-center py-2">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No assigned workouts. Ask trainer!</Text>
          </View>
        )}
      </Card>

      {/* Broadcast news notices */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Gym Announcements</Text>
      {filteredNotices.length === 0 ? (
        <Card className="items-center py-6 mb-6">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No announcements posted.</Text>
        </Card>
      ) : (
        filteredNotices.map((n) => (
          <Card key={n.id} className="mb-3 p-4 border-l-4 border-l-primary">
            <View className="flex-row justify-between items-start mb-1.5">
              <Text style={{ color: colors.text }} className="text-sm font-black">{n.title}</Text>
              {n.priority === 'urgent' && <Badge status="Urgent" />}
            </View>
            <Text style={{ color: colors.textSecondary }} className="text-xs leading-5 font-semibold mb-2">
              {n.body}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold">Posted on {formatDate(n.date)}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
