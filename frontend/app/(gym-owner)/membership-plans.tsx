import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { PlanCard } from '../../components/PlanCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { validateRequired } from '../../utils/validators';
import { MemberPlan } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export default function MembershipPlansScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { memberPlans, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MemberPlan | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR' | 'EUR' | 'GBP'>('INR');
  const [featuresInput, setFeaturesInput] = useState('');
  const [colorTag, setColorTag] = useState('#6C47FF');
  const [isPopular, setIsPopular] = useState(false);

  // Form error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Filter gym branch membership plans
  const gymPlans = useMemo(() => memberPlans.filter(p => p.gymId === activeGymId), [memberPlans, activeGymId]);

  // 2. Search filtering
  const searchedPlans = useSearch(gymPlans, searchQuery, ['name']);

  // Predefined custom color choices for package customization
  const colorChoices = ["#6C47FF", "#00C896", "#FF6B35", "#3B82F6", "#EC4899"];

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setName('');
    setDuration('30');
    setPrice('');
    setCurrency('INR');
    setFeaturesInput('');
    setColorTag('#6C47FF');
    setIsPopular(false);
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenEdit = (plan: MemberPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDuration(plan.durationDays.toString());
    setPrice(plan.price.toString());
    setCurrency(plan.currency || 'USD');
    setFeaturesInput(plan.features.join(', '));
    setColorTag(plan.colorTag);
    setIsPopular(plan.isPopular);
    setErrors({});
    setModalVisible(true);
  };

  const handleSavePlan = () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(name)) tempErrors.name = "Plan name is required.";
    if (!validateRequired(duration) || isNaN(Number(duration))) tempErrors.duration = "Enter a valid numeric days count.";
    if (!validateRequired(price) || isNaN(Number(price))) tempErrors.price = "Enter a valid numeric price.";
    if (!validateRequired(featuresInput)) tempErrors.features = "Features list cannot be empty.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill all mandatory fields.");
      return;
    }

    const featuresList = featuresInput
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    if (editingPlan) {
      const updatedPlan: MemberPlan = {
        ...editingPlan,
        name,
        durationDays: Number(duration),
        price: Number(price),
        features: featuresList,
        colorTag,
        isPopular,
        currency
      };

      dispatch({ type: 'UPDATE_MEMBER_PLAN', payload: updatedPlan });
      toast.success(`Plan "${name}" updated successfully!`);
    } else {
      const newPlan: MemberPlan = {
        id: `mplan-${Date.now()}`,
        name,
        durationDays: Number(duration),
        price: Number(price),
        features: featuresList,
        colorTag,
        isPopular,
        gymId: activeGymId,
        currency
      };

      dispatch({ type: 'ADD_MEMBER_PLAN', payload: newPlan });
      toast.success(`Plan "${name}" created successfully!`);
    }

    setModalVisible(false);
  };

  const handleDeletePlan = (planId: string, planName: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete membership plan "${planName}"? Members currently registered to this plan won't be affected but it cannot be sold further.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dispatch({ type: 'DELETE_MEMBER_PLAN', payload: planId });
            toast.error("Membership plan removed.");
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search membership plans by name..."
      />

      <FlatList
        data={searchedPlans}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PlanCard
            plan={item}
            onEdit={() => handleOpenEdit(item)}
            onDelete={() => handleDeletePlan(item.id, item.name)}
          />
        )}
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">🏷️</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Plans Configured</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
              Tap the FAB below to create membership plans for your gym members!
            </Text>
          </Card>
        }
      />

      {/* FloatingFAB */}
      <TouchableOpacity
        onPress={handleOpenAdd}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ADD/EDIT MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                {editingPlan ? "Edit Membership Plan" : "Create Membership Plan"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Package Name"
                placeholder="e.g. Standard Annual Elite"
                value={name}
                onChangeText={setName}
                error={errors.name}
                icon="text-outline"
              />

              <Input
                label="Duration (Days)"
                placeholder="e.g. 30"
                value={duration}
                onChangeText={setDuration}
                error={errors.duration}
                keyboardType="numeric"
                icon="time-outline"
              />

              {/* Currency Selection */}
              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Select Currency</Text>
              <View className="flex-row gap-2 mb-5">
                {(['INR', 'USD', 'EUR', 'GBP'] as const).map((curr) => {
                  const isSelected = currency === curr;
                  const label = curr === 'INR' ? 'Rupees (₹)' : curr === 'USD' ? 'USD ($)' : curr === 'EUR' ? 'EUR (€)' : 'GBP (£)';
                  return (
                    <TouchableOpacity
                      key={curr}
                      onPress={() => setCurrency(curr)}
                      style={{
                        borderColor: isSelected ? '#6C47FF' : colors.border,
                        backgroundColor: isSelected ? 'rgba(108,71,255,0.08)' : 'transparent',
                        borderWidth: 1.5
                      }}
                      className="px-2 py-2 rounded-xl flex-1 items-center justify-center"
                    >
                      <Text style={{ color: isSelected ? '#6C47FF' : colors.text }} className="text-[10px] font-extrabold">
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Input
                label={`Pricing Total (${currency})`}
                placeholder="e.g. 150"
                value={price}
                onChangeText={setPrice}
                error={errors.price}
                keyboardType="numeric"
                icon="cash-outline"
              />

              <Input
                label="Bullet Features (separated by commas)"
                placeholder="e.g. Weight training, lockers, 1 Guest Pass"
                value={featuresInput}
                onChangeText={setFeaturesInput}
                error={errors.features}
                multiline={true}
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
                icon="list-outline"
              />

              {/* Dynamic tag selections */}
              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Package Theme Tag</Text>
              <View className="flex-row gap-3 mb-5">
                {colorChoices.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColorTag(c)}
                    style={{
                      backgroundColor: c,
                      borderColor: colorTag === c ? colors.text : 'transparent',
                      borderWidth: colorTag === c ? 2.5 : 0
                    }}
                    className="w-8 h-8 rounded-full shadow-sm"
                  />
                ))}
              </View>

              {/* Popularity toggle */}
              <View className="flex-row items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/30 rounded-xl mb-6">
                <View>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">Highlight Plan</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-0.5">Flags as the 'Most Popular' choice card</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsPopular(!isPopular)}
                  className={`w-12 h-6 rounded-full px-1 justify-center ${isPopular ? 'bg-primary items-end' : 'bg-gray-300 dark:bg-gray-700 items-start'}`}
                >
                  <View className="w-4.5 h-4.5 bg-white rounded-full" />
                </TouchableOpacity>
              </View>

              <Button
                title={editingPlan ? "Save Package Changes" : "Create Package"}
                onPress={handleSavePlan}
                className="rounded-xl mb-6"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
