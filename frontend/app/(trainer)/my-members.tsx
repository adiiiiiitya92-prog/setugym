import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { formatDate } from '../../utils/dateHelper';
import { Member, MemberPlan } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export default function MyMembersScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { members, memberPlans, dietPlans, workoutPlans, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const trainerId = user?.id || 'trainer-1';

  // State managers
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal displays
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [dietModalVisible, setDietModalVisible] = useState(false);
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);

  // Assign specific states
  const [assignDietId, setAssignDietId] = useState('');
  const [assignWorkoutId, setAssignWorkoutId] = useState('');

  // 1. Filter assigned members
  const myClients = useMemo(() => {
    return members.filter(m => m.gymId === activeGymId && m.assignedTrainerId === trainerId);
  }, [members, activeGymId, trainerId]);

  // 2. Search query filtration
  const searchedClients = useSearch(myClients, searchQuery, ['name', 'phone']);

  const getPlanName = (pId: string): string => {
    const plan = memberPlans.find(p => p.id === pId);
    return plan ? plan.name : "Custom Tier";
  };

  const getAssignedDietTitle = (mId: string): string => {
    const diet = dietPlans.find(d => d.assignedMemberId === mId);
    return diet ? diet.title : "No diet assigned";
  };

  const getAssignedWorkoutTitle = (mId: string): string => {
    const workout = workoutPlans.find(w => w.assignedMemberId === mId);
    return workout ? workout.title : "No workout assigned";
  };

  const handleOpenDetails = (member: Member) => {
    setSelectedMember(member);
    setDetailModalVisible(true);
  };

  const handleOpenAssignDiet = () => {
    if (!selectedMember) return;
    const current = dietPlans.find(d => d.assignedMemberId === selectedMember.id);
    setAssignDietId(current?.id || '');
    setDetailModalVisible(false);
    setDietModalVisible(true);
  };

  const handleAssignDiet = () => {
    if (!selectedMember || !assignDietId) return;
    dispatch({
      type: 'ASSIGN_DIET',
      payload: {
        memberId: selectedMember.id,
        dietId: assignDietId
      }
    });
    const dTitle = dietPlans.find(d => d.id === assignDietId)?.title;
    toast.success(`Assigned diet "${dTitle}" to ${selectedMember.name}`);
    setDietModalVisible(false);
  };

  const handleOpenAssignWorkout = () => {
    if (!selectedMember) return;
    const current = workoutPlans.find(w => w.assignedMemberId === selectedMember.id);
    setAssignWorkoutId(current?.id || '');
    setDetailModalVisible(false);
    setWorkoutModalVisible(true);
  };

  const handleAssignWorkout = () => {
    if (!selectedMember || !assignWorkoutId) return;
    dispatch({
      type: 'ASSIGN_WORKOUT',
      payload: {
        memberId: selectedMember.id,
        workoutId: assignWorkoutId
      }
    });
    const wTitle = workoutPlans.find(w => w.id === assignWorkoutId)?.title;
    toast.success(`Assigned workout "${wTitle}" to ${selectedMember.name}`);
    setWorkoutModalVisible(false);
  };

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
        placeholder="Search your clients by name..."
      />

      <FlatList
        data={searchedClients}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => (
          <Card onPress={() => handleOpenDetails(item)} className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1 mr-2">
                <Avatar name={item.name} uri={item.photoUrl} size={44} />
                <View className="ml-3 flex-1">
                  <Text style={{ color: colors.text }} className="text-base font-extrabold" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold" numberOfLines={1}>
                    {getPlanName(item.planId)}
                  </Text>
                </View>
              </View>
              <Badge status={item.status} />
            </View>

            <View className="flex-row gap-3 border-t border-gray-100 dark:border-gray-800 pt-3 mt-1 justify-between">
              <View className="flex-1 mr-2">
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Diet assigned</Text>
                <Text style={{ color: colors.text }} className="text-xs font-semibold mt-0.5" numberOfLines={1}>
                  {getAssignedDietTitle(item.id)}
                </Text>
              </View>
              <View className="items-end flex-1 ml-2">
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Workout split</Text>
                <Text style={{ color: colors.text }} className="text-xs font-semibold mt-0.5" numberOfLines={1}>
                  {getAssignedWorkoutTitle(item.id)}
                </Text>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">🏃</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Clients Assigned</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
              Ask your gym administrator to assign members to your trainer account!
            </Text>
          </Card>
        }
      />

      {/* DETAILED DRILLDOWN MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            {selectedMember && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-5">
                  <Text style={{ color: colors.text }} className="text-xl font-black">
                    Client File
                  </Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="p-1">
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View className="items-center mb-6">
                  <Avatar name={selectedMember.name} uri={selectedMember.photoUrl} size={64} />
                  <Text style={{ color: colors.text }} className="text-lg font-black mt-3">
                    {selectedMember.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">
                    Member ID: {selectedMember.id}
                  </Text>
                </View>

                {/* Body stats block */}
                <Text style={{ color: colors.text }} className="text-sm font-black mb-3">Recent Body Metrics</Text>
                <Card className="mb-6 p-4">
                  {selectedMember.bodyStatsLog && selectedMember.bodyStatsLog.length > 0 ? (
                    <View className="space-y-3">
                      <View className="flex-row justify-between">
                        <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Body Weight</Text>
                        <Text style={{ color: colors.text }} className="text-xs font-black">{selectedMember.bodyStatsLog[0].weight} kg</Text>
                      </View>
                      <View className="flex-row justify-between mt-1">
                        <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Stature Height</Text>
                        <Text style={{ color: colors.text }} className="text-xs font-semibold">{selectedMember.bodyStatsLog[0].height} cm</Text>
                      </View>
                      <View className="flex-row justify-between mt-1">
                        <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Calculated BMI</Text>
                        <Text style={{ color: '#00C896' }} className="text-xs font-black">{selectedMember.bodyStatsLog[0].bmi}</Text>
                      </View>
                      <View className="flex-row justify-between mt-1 border-t border-gray-100 dark:border-gray-800 pt-2">
                        <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Chest / Waist / Hips</Text>
                        <Text style={{ color: colors.text }} className="text-[10px] font-bold">
                          {selectedMember.bodyStatsLog[0].chest}" / {selectedMember.bodyStatsLog[0].waist}" / {selectedMember.bodyStatsLog[0].hips}"
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={{ color: colors.textSecondary }} className="text-xs text-center">No logged metrics recorded yet.</Text>
                  )}
                </Card>

                {/* Assignments */}
                <Text style={{ color: colors.text }} className="text-sm font-black mb-3">Custom Routines</Text>
                <View className="space-y-3.5 mb-8">
                  <View className="flex-row justify-between items-center bg-gray-50/50 dark:bg-gray-800/10 p-3 rounded-xl">
                    <View>
                      <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Assigned Diet</Text>
                      <Text style={{ color: colors.text }} className="text-xs font-bold mt-0.5">{getAssignedDietTitle(selectedMember.id)}</Text>
                    </View>
                    <TouchableOpacity onPress={handleOpenAssignDiet} className="bg-primary/10 px-3 py-1.5 rounded-lg">
                      <Text className="text-primary font-bold text-[10px] uppercase">Assign</Text>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row justify-between items-center bg-gray-50/50 dark:bg-gray-800/10 p-3 rounded-xl mt-2.5">
                    <View>
                      <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Assigned Workout</Text>
                      <Text style={{ color: colors.text }} className="text-xs font-bold mt-0.5">{getAssignedWorkoutTitle(selectedMember.id)}</Text>
                    </View>
                    <TouchableOpacity onPress={handleOpenAssignWorkout} className="bg-primary/10 px-3 py-1.5 rounded-lg">
                      <Text className="text-primary font-bold text-[10px] uppercase">Assign</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setDetailModalVisible(false);
                      router.push('/(trainer)/ai-assistant' as any);
                    }}
                    style={{
                      backgroundColor: 'rgba(108,71,255,0.1)',
                      borderColor: '#6C47FF'
                    }}
                    className="flex-row items-center justify-center p-3.5 rounded-xl border mt-3 mb-4"
                  >
                    <Ionicons name="sparkles" size={18} color="#6C47FF" className="mr-2" />
                    <Text style={{ color: '#6C47FF' }} className="font-bold text-xs ml-1.5">
                      Generate AI Workout for {selectedMember.name}
                    </Text>
                  </TouchableOpacity>
                </View>

                  <Button
                    title="Close File"
                    onPress={() => setDetailModalVisible(false)}
                    className="rounded-xl"
                  />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ASSIGN DIET MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={dietModalVisible}
        onRequestClose={() => setDietModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
            <Text style={{ color: colors.text }} className="text-lg font-black mb-2 text-center">Assign Diet Blueprint</Text>
            
            <View className="mb-6 space-y-2">
              {dietPlans.filter(d => d.gymId === activeGymId).map((d) => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => setAssignDietId(d.id)}
                  style={{
                    borderColor: assignDietId === d.id ? '#6C47FF' : colors.border,
                    backgroundColor: assignDietId === d.id ? 'rgba(108,71,255,0.08)' : 'transparent'
                  }}
                  className="p-3 border rounded-xl active:opacity-90 flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-xs font-bold">{d.title}</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[10px]">{d.dailyCalories} kcal</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3">
              <Button title="Cancel" variant="outline" onPress={() => setDietModalVisible(false)} className="flex-1 rounded-xl" />
              <Button title="Assign" onPress={handleAssignDiet} className="flex-1 rounded-xl" />
            </View>
          </View>
        </View>
      </Modal>

      {/* ASSIGN WORKOUT MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={workoutModalVisible}
        onRequestClose={() => setWorkoutModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
            <Text style={{ color: colors.text }} className="text-lg font-black mb-2 text-center">Assign Workout Split</Text>
            
            <View className="mb-6 space-y-2">
              {workoutPlans.filter(w => w.gymId === activeGymId).map((w) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setAssignWorkoutId(w.id)}
                  style={{
                    borderColor: assignWorkoutId === w.id ? '#6C47FF' : colors.border,
                    backgroundColor: assignWorkoutId === w.id ? 'rgba(108,71,255,0.08)' : 'transparent'
                  }}
                  className="p-3 border rounded-xl active:opacity-90 flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-xs font-bold">{w.title}</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[10px]">{w.daysPerWeek} days/wk</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3">
              <Button title="Cancel" variant="outline" onPress={() => setWorkoutModalVisible(false)} className="flex-1 rounded-xl" />
              <Button title="Assign" onPress={handleAssignWorkout} className="flex-1 rounded-xl" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
