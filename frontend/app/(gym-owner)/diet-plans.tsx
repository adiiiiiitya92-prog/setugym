import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
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
import { DietPlan, MealItem } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export default function DietPlansScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { dietPlans, members, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal displays
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState<DietPlan | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState<'Weight Loss' | 'Weight Gain' | 'Maintenance'>('Weight Loss');
  const [calories, setCalories] = useState('');
  
  // Quick simplified meal item text blocks
  const [breakfastText, setBreakfastText] = useState('');
  const [lunchText, setLunchText] = useState('');
  const [dinnerText, setDinnerText] = useState('');
  const [snacksText, setSnacksText] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Assign specific states
  const [assignMemberId, setAssignMemberId] = useState('');

  // 1. Filter gym diets
  const gymDiets = useMemo(() => dietPlans.filter(d => d.gymId === activeGymId), [dietPlans, activeGymId]);
  const gymMembers = useMemo(() => members.filter(m => m.gymId === activeGymId), [members, activeGymId]);

  // 2. Search query filtration
  const searchedDiets = useSearch(gymDiets, searchQuery, ['title', 'goal']);

  const getAssignedMemberName = (mId?: string): string => {
    if (!mId) return "Unassigned Template";
    const member = members.find(m => m.id === mId);
    return member ? member.name : "Unassigned Template";
  };

  const handleOpenAdd = () => {
    setTitle('');
    setGoal('Weight Loss');
    setCalories('');
    setBreakfastText('');
    setLunchText('');
    setDinnerText('');
    setSnacksText('');
    setErrors({});
    setAddModalVisible(true);
  };

  const handleCreateDiet = () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(title)) tempErrors.title = "Plan name is required.";
    if (!validateRequired(calories) || isNaN(Number(calories))) tempErrors.calories = "Enter a valid calorie count.";
    if (!validateRequired(breakfastText)) tempErrors.breakfast = "Breakfast item is required.";
    if (!validateRequired(lunchText)) tempErrors.lunch = "Lunch item is required.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please resolve form errors.");
      return;
    }

    // Process raw texts to meal items (mocking simple calories and protein metrics)
    const mapMealTextToItem = (text: string): MealItem[] => {
      return text.split(',').map(item => ({
        name: item.trim(),
        calories: Math.floor(Number(calories) / 4),
        protein: 20,
        carbs: 30,
        fat: 8
      }));
    };

    const newDiet: DietPlan = {
      id: `diet-${Date.now()}`,
      title,
      goal,
      dailyCalories: Number(calories),
      meals: {
        breakfast: mapMealTextToItem(breakfastText),
        lunch: mapMealTextToItem(lunchText),
        dinner: mapMealTextToItem(dinnerText || "Steamed Greens & Water"),
        snacks: mapMealTextToItem(snacksText || "Whey Protein Shake")
      },
      gymId: activeGymId
    };

    dispatch({ type: 'ADD_DIET', payload: newDiet });
    toast.success(`Diet "${title}" published!`);
    setAddModalVisible(false);
  };

  const handleOpenAssign = (diet: DietPlan) => {
    setSelectedDiet(diet);
    setAssignMemberId(gymMembers[0]?.id || '');
    setAssignModalVisible(true);
  };

  const handleAssign = () => {
    if (!selectedDiet || !assignMemberId) return;
    dispatch({
      type: 'ASSIGN_DIET',
      payload: {
        memberId: assignMemberId,
        dietId: selectedDiet.id
      }
    });
    const mName = members.find(m => m.id === assignMemberId)?.name;
    toast.success(`Assigned diet "${selectedDiet.title}" to ${mName}`);
    setAssignModalVisible(false);
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
        placeholder="Search diets by name or goal..."
      />

      <FlatList
        data={searchedDiets}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => (
          <Card className="mb-4">
            <View className="flex-row justify-between items-start mb-3">
              <View>
                <Text style={{ color: colors.text }} className="text-base font-extrabold">
                  {item.title}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">
                  Daily Intake: <Text className="font-bold text-primary">{item.dailyCalories} kcal</Text>
                </Text>
              </View>
              <Badge status={item.goal === 'Weight Loss' ? 'Expired' : item.goal === 'Weight Gain' ? 'Trial' : 'Pending'} style={{ opacity: 0.9 }} />
            </View>

            {/* Meals preview */}
            <View className="space-y-1.5 border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
              <Text style={{ color: colors.text }} className="text-xs font-semibold leading-5" numberOfLines={1}>
                🍳 Breakfast: {item.meals.breakfast.map(b => b.name).join(', ')}
              </Text>
              <Text style={{ color: colors.text }} className="text-xs font-semibold leading-5 mt-1" numberOfLines={1}>
                🍗 Lunch: {item.meals.lunch.map(l => l.name).join(', ')}
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
                <Text className="text-primary font-bold text-[10px] uppercase">Assign Member</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">🥗</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Diet Plans</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 max-w-[200px] leading-4">
              Tap the FAB below to create diet blueprints!
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

      {/* CREATE DIET MODAL FORM */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Create Diet Blueprint
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Blueprint Title"
                placeholder="e.g. Lean Shred Phase 1"
                value={title}
                onChangeText={setTitle}
                error={errors.title}
                icon="text-outline"
              />

              <Input
                label="Daily Calories (kcal)"
                placeholder="e.g. 1800"
                value={calories}
                onChangeText={setCalories}
                error={errors.calories}
                keyboardType="numeric"
                icon="flame-outline"
              />

              {/* Goal choices */}
              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Diet Target Goal</Text>
              <View className="flex-row gap-2.5 mb-4">
                {(['Weight Loss', 'Weight Gain', 'Maintenance'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGoal(g)}
                    style={{
                      borderColor: goal === g ? '#6C47FF' : colors.border,
                      backgroundColor: goal === g ? 'rgba(108,71,255,0.08)' : 'transparent'
                    }}
                    className="flex-1 py-2.5 border rounded-xl items-center"
                  >
                    <Text style={{ color: goal === g ? '#6C47FF' : colors.text }} className="text-[9px] font-bold">
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Breakfast Meals (separate by commas)"
                placeholder="e.g. Egg Whites, Oats, Blueberries"
                value={breakfastText}
                onChangeText={setBreakfastText}
                error={errors.breakfast}
                icon="sunny-outline"
              />

              <Input
                label="Lunch Meals"
                placeholder="e.g. Grilled Chicken, Brown Rice, Broccoli"
                value={lunchText}
                onChangeText={setLunchText}
                error={errors.lunch}
                icon="restaurant-outline"
              />

              <Input
                label="Dinner Meals"
                placeholder="e.g. Salmon, Salad, Olive Oil"
                value={dinnerText}
                onChangeText={setDinnerText}
                icon="moon-outline"
              />

              <Input
                label="Snacks"
                placeholder="e.g. Almonds, Whey Protein shake"
                value={snacksText}
                onChangeText={setSnacksText}
                icon="basket-outline"
              />

              <Button
                title="Publish Diet Plan"
                onPress={handleCreateDiet}
                className="rounded-xl mt-4 mb-6"
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
            <Text style={{ color: colors.text }} className="text-lg font-black mb-2 text-center">Assign Diet Plan</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs mb-5 text-center font-medium">Select a gym member to assign "{selectedDiet?.title}":</Text>
            
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
