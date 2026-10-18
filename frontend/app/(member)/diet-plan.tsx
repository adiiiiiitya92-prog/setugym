import React, { useState, useContext, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function MemberDietScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { dietPlans } = gymContext;

  const memberId = user?.id || 'member-john';

  // Day of week selector
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [waterGlasses, setWaterGlasses] = useState(3); // water intake count

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // 1. Fetch assigned diet
  const assignedDiet = useMemo(() => {
    return dietPlans.find(d => d.assignedMemberId === memberId);
  }, [dietPlans, memberId]);

  const handleIncrementWater = () => {
    if (waterGlasses < 12) {
      setWaterGlasses(waterGlasses + 1);
    }
  };

  const handleDecrementWater = () => {
    if (waterGlasses > 0) {
      setWaterGlasses(waterGlasses - 1);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <View className="mb-6 mt-1">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
          NUTRITION BLUEPRINT
        </Text>
        <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight mt-1">
          Diet Planner
        </Text>
      </View>

      {/* Weekdays selector */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} className="mb-5 flex-row">
        {days.map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setSelectedDay(d)}
            style={{
              backgroundColor: selectedDay === d ? '#6C47FF' : colors.card,
              borderColor: selectedDay === d ? '#6C47FF' : colors.border
            }}
            className="px-4 py-2 border rounded-xl mr-2 shadow-sm"
          >
            <Text
              style={{
                color: selectedDay === d ? '#FFFFFF' : colors.text,
              }}
              className="text-xs font-bold"
            >
              {d.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Water Tracker */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Hydration Tracker</Text>
      <Card className="mb-6 p-5">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text style={{ color: colors.text }} className="text-base font-extrabold">Water Intake</Text>
            <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-0.5 font-semibold">Recommended: 8-10 glasses (2.5L)</Text>
          </View>
          <View className="bg-primary/5 px-3 py-1.5 rounded-lg">
            <Text style={{ color: '#6C47FF' }} className="text-sm font-black">{waterGlasses} Glasses</Text>
          </View>
        </View>

        {/* Glasses visualizer grid */}
        <View className="flex-row gap-2.5 justify-start mb-5 flex-wrap">
          {Array.from({ length: 10 }).map((_, idx) => (
            <Ionicons
              key={idx}
              name="water"
              size={24}
              color={idx < waterGlasses ? "#3B82F6" : colors.border}
            />
          ))}
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={handleDecrementWater}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl items-center"
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleIncrementWater}
            className="flex-1 py-2.5 bg-primary rounded-xl items-center"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Assigned Diet Details */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Today's Meal Breakdown</Text>
      
      {assignedDiet ? (
        <View className="space-y-4">
          <Card className="p-4 mb-4">
            <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <View>
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Assigned formula</Text>
                <Text style={{ color: colors.text }} className="text-base font-black mt-0.5">{assignedDiet.title}</Text>
              </View>
              <Badge status={assignedDiet.goal === 'Weight Loss' ? 'Expired' : 'Trial'} />
            </View>

            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text className="text-lg font-black text-primary">{assignedDiet.dailyCalories}</Text>
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Calories</Text>
              </View>
              <View className="items-center flex-1 border-x border-gray-100 dark:border-gray-800">
                <Text className="text-lg font-black text-secondary">140g</Text>
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Protein</Text>
              </View>
              <View className="items-center flex-1">
                <Text className="text-lg font-black text-accent">160g</Text>
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Carbs</Text>
              </View>
            </View>
          </Card>

          {/* Meals detail blocks */}
          <Card className="mb-3 p-4">
            <View className="flex-row justify-between mb-2">
              <Text style={{ color: colors.text }} className="text-sm font-extrabold">🍳 Breakfast</Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs">08:00 AM</Text>
            </View>
            {assignedDiet.meals.breakfast.map((m, idx) => (
              <Text key={idx} style={{ color: colors.textSecondary }} className="text-xs font-semibold leading-5 pl-1.5 mt-0.5">
                • {m.name} ({m.calories} kcal)
              </Text>
            ))}
          </Card>

          <Card className="mb-3 p-4">
            <View className="flex-row justify-between mb-2">
              <Text style={{ color: colors.text }} className="text-sm font-extrabold">🍗 Lunch</Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs">01:30 PM</Text>
            </View>
            {assignedDiet.meals.lunch.map((m, idx) => (
              <Text key={idx} style={{ color: colors.textSecondary }} className="text-xs font-semibold leading-5 pl-1.5 mt-0.5">
                • {m.name} ({m.calories} kcal)
              </Text>
            ))}
          </Card>

          <Card className="mb-3 p-4">
            <View className="flex-row justify-between mb-2">
              <Text style={{ color: colors.text }} className="text-sm font-extrabold">🥗 Dinner</Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs">08:30 PM</Text>
            </View>
            {assignedDiet.meals.dinner.map((m, idx) => (
              <Text key={idx} style={{ color: colors.textSecondary }} className="text-xs font-semibold leading-5 pl-1.5 mt-0.5">
                • {m.name} ({m.calories} kcal)
              </Text>
            ))}
          </Card>
        </View>
      ) : (
        <Card className="items-center py-8">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No assigned nutrition plans currently found.</Text>
        </Card>
      )}
    </ScrollView>
  );
}
