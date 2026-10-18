import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { validateRequired } from '../../utils/validators';
import { WorkoutPlan, Exercise } from '../../types';
import { Ionicons } from '@expo/vector-icons';

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function WorkoutPlansScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { workoutPlans, members, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutPlan | null>(null);

  // Details Modal tab state
  const [detailsActiveTab, setDetailsActiveTab] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  
  // Day-wise exercises states
  const [schedule, setSchedule] = useState<Record<string, Exercise[]>>({});
  const [activeDay, setActiveDay] = useState('Monday');

  // Exercise Sub-Form States
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('4');
  const [exReps, setExReps] = useState('10');
  const [exRest, setExRest] = useState('60');
  const [exNotes, setExNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Assign specific states
  const [assignMemberId, setAssignMemberId] = useState('');

  // 1. Filter gym workouts
  const gymWorkouts = useMemo(() => workoutPlans.filter(w => w.gymId === activeGymId), [workoutPlans, activeGymId]);
  const gymMembers = useMemo(() => members.filter(m => m.gymId === activeGymId), [members, activeGymId]);

  // 2. Search query filtration
  const searchedWorkouts = useSearch(gymWorkouts, searchQuery, ['title', 'goal']);

  const getAssignedMemberName = (mId?: string): string => {
    if (!mId) return "Unassigned Template";
    const member = members.find(m => m.id === mId);
    return member ? member.name : "Unassigned Template";
  };

  const handleOpenAdd = () => {
    setTitle('');
    setGoal('');
    setDaysPerWeek('3');
    setSchedule({});
    setActiveDay('Monday');
    setExName('');
    setExSets('4');
    setExReps('10');
    setExRest('60');
    setExNotes('');
    setErrors({});
    setAddModalVisible(true);
  };

  const handleAddExercise = () => {
    if (!exName.trim()) {
      toast.error("Please enter an exercise name.");
      return;
    }
    
    const newEx: Exercise = {
      name: exName.trim(),
      sets: Number(exSets) || 4,
      reps: exReps.trim() || '10',
      restSeconds: Number(exRest) || 60,
      notes: exNotes.trim()
    };

    setSchedule(prev => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), newEx]
    }));

    // Clear sub-form
    setExName('');
    setExNotes('');
    toast.success(`Added ${newEx.name} to ${activeDay}!`);
  };

  const handleRemoveExercise = (day: string, idx: number) => {
    setSchedule(prev => {
      const updatedList = [...(prev[day] || [])];
      updatedList.splice(idx, 1);
      const next = { ...prev };
      if (updatedList.length === 0) {
        delete next[day];
      } else {
        next[day] = updatedList;
      }
      return next;
    });
    toast.error("Exercise removed.");
  };

  const handleCreateWorkout = () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(title)) tempErrors.title = "Workout title is required.";
    if (!validateRequired(goal)) tempErrors.goal = "Workout goal description is required.";
    if (!validateRequired(daysPerWeek) || isNaN(Number(daysPerWeek))) tempErrors.daysPerWeek = "Enter numeric days count.";

    if (Object.keys(schedule).length === 0) {
      toast.error("Please add at least one exercise to any day of the week.");
      return;
    }

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please resolve form errors.");
      return;
    }

    const newWorkout: WorkoutPlan = {
      id: `workout-${Date.now()}`,
      title,
      goal,
      daysPerWeek: Number(daysPerWeek),
      schedule,
      gymId: activeGymId
    };

    dispatch({ type: 'ADD_WORKOUT', payload: newWorkout });
    toast.success(`Workout split "${title}" published successfully!`);
    setAddModalVisible(false);
  };

  const handleOpenAssign = (workout: WorkoutPlan) => {
    setSelectedWorkout(workout);
    setAssignMemberId(gymMembers[0]?.id || '');
    setAssignModalVisible(true);
  };

  const handleAssign = () => {
    if (!selectedWorkout || !assignMemberId) return;
    dispatch({
      type: 'ASSIGN_WORKOUT',
      payload: {
        memberId: assignMemberId,
        workoutId: selectedWorkout.id
      }
    });
    const mName = members.find(m => m.id === assignMemberId)?.name;
    toast.success(`Assigned workout "${selectedWorkout.title}" to ${mName}`);
    setAssignModalVisible(false);
  };

  const handleOpenDetails = (workout: WorkoutPlan) => {
    setSelectedWorkout(workout);
    const dayKeys = Object.keys(workout.schedule);
    setDetailsActiveTab(dayKeys[0] || '');
    setDetailsModalVisible(true);
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
        placeholder="Search workouts by name or goal..."
      />

      {/* AI Assistant Banner */}
      <TouchableOpacity
        onPress={() => router.push('/(trainer)/ai-assistant' as any)}
        activeOpacity={0.85}
        style={{
          borderColor: '#6C47FF',
          backgroundColor: 'rgba(108,71,255,0.08)'
        }}
        className="my-3 p-4 rounded-2xl border flex-row items-center justify-between"
      >
        <View className="flex-row items-center flex-1 mr-3">
          <View
            style={{ backgroundColor: '#6C47FF' }}
            className="w-10 h-10 rounded-xl items-center justify-center mr-3 shadow-sm"
          >
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }} className="text-sm font-black">
              AI Workout Assistant
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5">
              Generate custom periodized splits for your trainees
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#6C47FF" />
      </TouchableOpacity>

      <FlatList
        data={searchedWorkouts}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => {
          const dayKeys = Object.keys(item.schedule);
          const totalExercises = dayKeys.reduce((acc, k) => acc + (item.schedule[k]?.length || 0), 0);
          
          return (
            <Card onPress={() => handleOpenDetails(item)} className="mb-4">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                  <Text style={{ color: colors.text }} className="text-base font-extrabold" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">
                    Split Ratio: <Text className="font-bold text-primary">{item.daysPerWeek} Days / Week</Text>
                  </Text>
                </View>
                <Badge status={item.daysPerWeek >= 4 ? 'Urgent' : 'Normal'} />
              </View>

              <View className="border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-1">Target Goal Focus</Text>
                <Text style={{ color: colors.text }} className="text-xs font-bold leading-5">
                  🎯 {item.goal}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-2">
                  💪 {dayKeys.length} Days Split ({totalExercises} Total Exercises)
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="person-outline" size={14} color={colors.textSecondary} className="mr-1" />
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold">
                    {getAssignedMemberName(item.assignedMemberId)}
                  </Text>
                </View>
                
                <TouchableOpacity
                  onPress={() => handleOpenAssign(item)}
                  className="bg-primary/10 px-3.5 py-1.5 rounded-lg active:opacity-90"
                >
                  <Text className="text-primary font-bold text-[10px] uppercase">Assign Client</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">🏋️‍♀️</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Workout splits</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 max-w-[200px] leading-4">
              Tap the FAB below to build workout split blueprints!
            </Text>
          </Card>
        }
      />

      {/* FAB trigger */}
      <TouchableOpacity
        onPress={handleOpenAdd}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* DETAILED DRILLDOWN MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            {selectedWorkout && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="text-xl font-black">
                      {selectedWorkout.title}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">
                      Goal: {selectedWorkout.goal}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailsModalVisible(false)} className="p-1">
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Day selector tabs */}
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="mb-4 flex-row py-1">
                  {Object.keys(selectedWorkout.schedule).map(dayKey => (
                    <TouchableOpacity
                      key={dayKey}
                      onPress={() => setDetailsActiveTab(dayKey)}
                      style={{
                        backgroundColor: detailsActiveTab === dayKey ? '#6C47FF' : 'rgba(0,0,0,0.03)',
                        borderColor: detailsActiveTab === dayKey ? '#6C47FF' : colors.border
                      }}
                      className="px-4 py-2 border rounded-xl mr-2"
                    >
                      <Text
                        style={{ color: detailsActiveTab === dayKey ? '#FFFFFF' : colors.text }}
                        className="text-xs font-bold"
                      >
                        {dayKey}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Exercises list */}
                <Text style={{ color: colors.text }} className="text-sm font-black mb-3">Exercises Matrix</Text>
                <View className="mb-6 space-y-3">
                  {(!detailsActiveTab || !selectedWorkout.schedule[detailsActiveTab] || selectedWorkout.schedule[detailsActiveTab].length === 0) ? (
                    <Text style={{ color: colors.textSecondary }} className="text-xs italic py-2">No exercises configured for this day.</Text>
                  ) : (
                    selectedWorkout.schedule[detailsActiveTab].map((ex, idx) => (
                      <Card key={idx} className="p-4.5 mb-2.5">
                        <Text style={{ color: colors.text }} className="text-sm font-extrabold">{ex.name}</Text>
                        <View className="flex-row items-center mt-1.5 flex-wrap gap-x-4 gap-y-1">
                          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">
                            Sets: <Text className="font-bold text-primary">{ex.sets}</Text>
                          </Text>
                          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">
                            Reps: <Text className="font-bold text-primary">{ex.reps}</Text>
                          </Text>
                          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">
                            Rest: <Text className="font-bold text-primary">{ex.restSeconds}s</Text>
                          </Text>
                        </View>
                        {ex.notes ? (
                          <Text style={{ color: colors.textSecondary }} className="text-[9px] italic mt-2 leading-4">
                            * {ex.notes}
                          </Text>
                        ) : null}
                      </Card>
                    ))
                  )}
                </View>

                <Button title="Close Details" onPress={() => setDetailsModalVisible(false)} className="rounded-xl mb-4" />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* CREATE WORKOUT SPLIT MODAL FORM */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[90%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Create Weekly Workout
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Workout Plan Title"
                placeholder="e.g. Push-Pull-Legs Split"
                value={title}
                onChangeText={setTitle}
                error={errors.title}
                icon="text-outline"
              />

              <Input
                label="Target Goal / Description"
                placeholder="e.g. Muscle Gain & Hypertrophy"
                value={goal}
                onChangeText={setGoal}
                error={errors.goal}
                icon="flame-outline"
              />

              <Input
                label="Days Per Week"
                placeholder="e.g. 3"
                value={daysPerWeek}
                onChangeText={setDaysPerWeek}
                error={errors.daysPerWeek}
                keyboardType="numeric"
                icon="calendar-outline"
              />

              {/* Day selection row */}
              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2.5 ml-0.5">Configure Split Days</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                {DAYS_OF_WEEK.map((day) => {
                  const hasExercises = schedule[day] && schedule[day].length > 0;
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setActiveDay(day)}
                      style={{
                        backgroundColor: activeDay === day ? '#6C47FF' : 'transparent',
                        borderColor: activeDay === day ? '#6C47FF' : colors.border
                      }}
                      className="px-3.5 py-2 border rounded-xl mr-2 flex-row items-center"
                    >
                      <Text
                        style={{ color: activeDay === day ? '#FFFFFF' : colors.text }}
                        className="text-xs font-bold"
                      >
                        {day.substring(0, 3)}
                      </Text>
                      {hasExercises && (
                        <View className="w-1.5 h-1.5 bg-emerald-500 rounded-full ml-1" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Exercise list for current day */}
              <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-2 ml-0.5">
                Exercises for {activeDay} ({schedule[activeDay]?.length || 0})
              </Text>
              
              <View className="mb-4 bg-gray-50/50 dark:bg-gray-800/10 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/40">
                {(!schedule[activeDay] || schedule[activeDay].length === 0) ? (
                  <Text style={{ color: colors.textSecondary }} className="text-xs italic text-center py-4">No exercises added to {activeDay} yet.</Text>
                ) : (
                  schedule[activeDay].map((ex, idx) => (
                    <View key={idx} className="flex-row justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <View className="flex-1 mr-2">
                        <Text style={{ color: colors.text }} className="text-xs font-extrabold">{ex.name}</Text>
                        <Text style={{ color: colors.textSecondary }} className="text-[9px] font-semibold mt-0.5">
                          {ex.sets} Sets x {ex.reps} Reps | Rest: {ex.restSeconds}s
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveExercise(activeDay, idx)} className="p-1">
                        <Ionicons name="trash-outline" size={14} color="#FF6B35" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Sub-form to add exercise to activeDay */}
              <Card className="p-4.5 mb-5 border border-primary/20 bg-primary/2">
                <Text style={{ color: '#6C47FF' }} className="text-xs font-black uppercase tracking-wider mb-3">Add Exercise to {activeDay}</Text>
                
                <Input
                  label="Exercise Name"
                  placeholder="e.g. Flat Dumbbell Bench Press"
                  value={exName}
                  onChangeText={setExName}
                  icon="barbell-outline"
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label="Sets"
                      placeholder="e.g. 4"
                      value={exSets}
                      onChangeText={setExSets}
                      keyboardType="numeric"
                      icon="refresh-outline"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Reps"
                      placeholder="e.g. 10 or 8-12"
                      value={exReps}
                      onChangeText={setExReps}
                      icon="help-circle-outline"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Rest (sec)"
                      placeholder="e.g. 60"
                      value={exRest}
                      onChangeText={setExRest}
                      keyboardType="numeric"
                      icon="time-outline"
                    />
                  </View>
                </View>

                <Input
                  label="Execution Notes (Optional)"
                  placeholder="e.g. Squeeze chest, 3s eccentric"
                  value={exNotes}
                  onChangeText={setExNotes}
                  icon="document-text-outline"
                />

                <Button
                  title={`Add to ${activeDay}`}
                  onPress={handleAddExercise}
                  variant="outline"
                  className="rounded-xl mt-2 py-3"
                  style={{ borderColor: '#6C47FF' }}
                />
              </Card>

              <Button
                title="Publish Workout Split"
                onPress={handleCreateWorkout}
                className="rounded-xl mb-6 py-3.5"
                style={{ backgroundColor: '#6C47FF' }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CHOOSE CLIENT MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
            <Text style={{ color: colors.text }} className="text-lg font-black mb-2 text-center">Assign Workout Split</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs mb-5 text-center font-medium">Select a gym client to assign "{selectedWorkout?.title}":</Text>
            
            <View className="mb-6 space-y-2">
              {gymMembers.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setAssignMemberId(m.id)}
                  style={{
                    borderColor: assignMemberId === m.id ? '#6C47FF' : colors.border,
                    backgroundColor: assignMemberId === m.id ? 'rgba(108,71,255,0.08)' : 'transparent'
                  }}
                  className="p-3 border rounded-xl active:opacity-90"
                >
                  <Text style={{ color: colors.text }} className="text-xs font-bold">{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3">
              <Button title="Cancel" variant="outline" onPress={() => setAssignModalVisible(false)} className="flex-1 rounded-xl" />
              <Button title="Assign" onPress={handleAssign} className="flex-1 rounded-xl" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
