import React, { useState, useContext, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

export default function MemberWorkoutScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { workoutPlans } = gymContext;

  const memberId = user?.id || 'member-john';

  // Day Split selector state
  const [selectedDayTab, setSelectedDayTab] = useState('');
  // Checkbox done tracker
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});

  // 1. Fetch assigned workout program
  const assignedWorkout = useMemo(() => {
    return workoutPlans.find(w => w.assignedMemberId === memberId);
  }, [workoutPlans, memberId]);

  // Set default day tab on load
  const dayKeys = useMemo(() => {
    if (!assignedWorkout) return [];
    const keys = Object.keys(assignedWorkout.schedule);
    if (keys.length > 0 && !selectedDayTab) {
      setSelectedDayTab(keys[0]);
    }
    return keys;
  }, [assignedWorkout, selectedDayTab]);

  const activeExercises = useMemo(() => {
    if (!assignedWorkout || !selectedDayTab) return [];
    return assignedWorkout.schedule[selectedDayTab] || [];
  }, [assignedWorkout, selectedDayTab]);

  // Compute completion percent
  const completionPercentage = useMemo(() => {
    if (activeExercises.length === 0) return 0;
    const completed = activeExercises.filter((_, idx) => {
      const key = `${selectedDayTab}-${idx}`;
      return completedExercises[key] === true;
    }).length;
    return Math.round((completed / activeExercises.length) * 100);
  }, [activeExercises, completedExercises, selectedDayTab]);

  const handleToggleDone = (idx: number) => {
    const key = `${selectedDayTab}-${idx}`;
    const prev = completedExercises[key] || false;
    setCompletedExercises({
      ...completedExercises,
      [key]: !prev
    });
    if (!prev) {
      toast.success("Excellent! Exercise marked as done.");
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <View className="mb-4 mt-1">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
          FITNESS WORKOUT MATRIX
        </Text>
        <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight mt-1">
          Workout Program
        </Text>
      </View>

      {/* AI Coach Banner */}
      <TouchableOpacity
        onPress={() => router.push('/(member)/ai-coach' as any)}
        activeOpacity={0.85}
        style={{
          borderColor: '#6C47FF',
          backgroundColor: 'rgba(108,71,255,0.08)'
        }}
        className="mb-6 p-4 rounded-2xl border flex-row items-center justify-between"
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
              AI Workout Coach
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5">
              Get personalized splits, sets & reps tailored to your BMI
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#6C47FF" />
      </TouchableOpacity>

      {assignedWorkout ? (
        <View>
          {/* Split Tabs selectors */}
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="mb-5 flex-row">
            {dayKeys.map((dayKey) => (
              <TouchableOpacity
                key={dayKey}
                onPress={() => setSelectedDayTab(dayKey)}
                style={{
                  backgroundColor: selectedDayTab === dayKey ? '#6C47FF' : colors.card,
                  borderColor: selectedDayTab === dayKey ? '#6C47FF' : colors.border
                }}
                className="px-4 py-2 border rounded-xl mr-2 shadow-sm"
              >
                <Text
                  style={{
                    color: selectedDayTab === dayKey ? '#FFFFFF' : colors.text,
                  }}
                  className="text-xs font-bold"
                >
                  {dayKey.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Progress Card */}
          <Card className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Workout Split</Text>
                <Text style={{ color: colors.text }} className="text-base font-black mt-0.5">{selectedDayTab}</Text>
              </View>
              <Badge status={completionPercentage === 100 ? 'Paid' : 'Pending'} />
            </View>

            {/* Progress bar visual slider */}
            <View className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-3 overflow-hidden">
              <View
                style={{
                  width: `${completionPercentage}%`,
                  backgroundColor: completionPercentage === 100 ? '#00C896' : '#6C47FF'
                }}
                className="h-full rounded-full"
              />
            </View>

            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">
              {completionPercentage}% Exercises Completed
            </Text>
          </Card>

          {/* Exercises list details */}
          <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Exercises Matrix</Text>
          
          <View className="space-y-3.5">
            {activeExercises.map((ex, idx) => {
              const isDone = completedExercises[`${selectedDayTab}-${idx}`] === true;
              return (
                <Card 
                  key={idx} 
                  style={{ borderColor: isDone ? '#00C896' : colors.border, opacity: isDone ? 0.75 : 1 }}
                  className="mb-3 p-4 flex-row items-center justify-between"
                >
                  <View className="flex-1 mr-3">
                    <Text 
                      style={{ 
                        color: colors.text,
                        textDecorationLine: isDone ? 'line-through' : 'none'
                      }} 
                      className="text-sm font-extrabold"
                    >
                      {ex.name}
                    </Text>
                    <View className="flex-row items-center mt-1 flex-wrap gap-x-3 gap-y-1">
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
                      <Text style={{ color: colors.textSecondary }} className="text-[9px] italic mt-1.5 leading-4">
                        * {ex.notes}
                      </Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleToggleDone(idx)}
                    style={{
                      backgroundColor: isDone ? '#00C896' : 'transparent',
                      borderColor: isDone ? '#00C896' : colors.textSecondary,
                      borderWidth: 1.5
                    }}
                    className="w-6 h-6 rounded-full items-center justify-center shadow-sm"
                  >
                    {isDone && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                </Card>
              );
            })}
          </View>
        </View>
      ) : (
        <Card className="items-center py-8">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No assigned workout split blueprints found.</Text>
        </Card>
      )}
    </ScrollView>
  );
}
