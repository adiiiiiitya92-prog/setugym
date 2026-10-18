import React, { useState, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { PlanCard } from '../../components/PlanCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { validateRequired } from '../../utils/validators';
import { SubscriptionPlan } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export default function SubscriptionPlansScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { subscriptionPlans, dispatch } = gymContext;

  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [maxTrainers, setMaxTrainers] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Form error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter plans using useSearch
  const filteredPlans = useSearch(subscriptionPlans, searchQuery, ['name']);

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setName('');
    setPrice('');
    setMaxMembers('');
    setMaxTrainers('');
    setDurationDays('');
    setFeaturesInput('');
    setIsHighlighted(false);
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPrice(plan.price.toString());
    setMaxMembers(plan.maxMembers.toString());
    setMaxTrainers(plan.maxTrainers.toString());
    setDurationDays(plan.durationDays?.toString() || '30');
    setFeaturesInput(plan.features.join(', '));
    setIsHighlighted(plan.isHighlighted);
    setErrors({});
    setModalVisible(true);
  };

  const handleSavePlan = () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(name)) tempErrors.name = "Plan name is required.";
    if (!validateRequired(price) || isNaN(Number(price))) tempErrors.price = "Enter a valid numeric price.";
    if (!validateRequired(maxMembers) || isNaN(Number(maxMembers))) tempErrors.maxMembers = "Enter a valid numeric member capacity.";
    if (!validateRequired(maxTrainers) || isNaN(Number(maxTrainers))) tempErrors.maxTrainers = "Enter a valid numeric staff capacity.";
    if (!validateRequired(durationDays) || isNaN(Number(durationDays))) tempErrors.durationDays = "Enter a valid number of days.";
    if (!validateRequired(featuresInput)) tempErrors.features = "Feature list cannot be empty.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please resolve form errors.");
      return;
    }

    const featuresList = featuresInput
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    if (editingPlan) {
      // Edit mode
      const updatedPlan: SubscriptionPlan = {
        ...editingPlan,
        name,
        price: Number(price),
        maxMembers: Number(maxMembers),
        maxTrainers: Number(maxTrainers),
        durationDays: Number(durationDays),
        features: featuresList,
        isHighlighted
      };

      dispatch({ type: 'UPDATE_SUB_PLAN', payload: updatedPlan });
      toast.success(`Plan "${name}" updated successfully!`);
    } else {
      // Add mode
      const newPlan: SubscriptionPlan = {
        id: `sub-${Date.now()}`,
        name,
        price: Number(price),
        maxMembers: Number(maxMembers),
        maxTrainers: Number(maxTrainers),
        durationDays: Number(durationDays),
        features: featuresList,
        isHighlighted,
        isActive: true
      };

      dispatch({ type: 'ADD_SUB_PLAN', payload: newPlan });
      toast.success(`Plan "${name}" created successfully!`);
    }

    setModalVisible(false);
  };

  const handleDeletePlan = (planId: string, planName: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete plan tier "${planName}"? Owners currently subscribed will lose their capacities.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dispatch({ type: 'DELETE_SUB_PLAN', payload: planId });
            toast.error("Subscription plan deleted.");
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
        placeholder="Search subscription plans by name..."
      />

      <FlatList
        data={filteredPlans}
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
            <Text style={{ color: colors.text }} className="text-base font-bold">No Plans Defined</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
              Register subscription structures sold to gyms!
            </Text>
          </Card>
        }
      />

      {/* Floating add button */}
      <TouchableOpacity
        onPress={handleOpenAdd}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* EDIT/ADD PLAN MODAL */}
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
                {editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Plan Display Name"
                placeholder="e.g. Platinum Business Standard"
                value={name}
                onChangeText={setName}
                error={errors.name}
                icon="text-outline"
              />

              <Input
                label="Monthly Pricing (₹ INR)"
                placeholder="e.g. 99"
                value={price}
                onChangeText={setPrice}
                error={errors.price}
                keyboardType="numeric"
                icon="cash-outline"
              />

              <Input
                label="Max Gym Members Allowed"
                placeholder="e.g. 250"
                value={maxMembers}
                onChangeText={setMaxMembers}
                error={errors.maxMembers}
                keyboardType="numeric"
                icon="people-outline"
              />

              <Input
                label="Max Trainer Accounts Allowed"
                placeholder="e.g. 10"
                value={maxTrainers}
                onChangeText={setMaxTrainers}
                error={errors.maxTrainers}
                keyboardType="numeric"
                icon="barbell-outline"
              />

              <Input
                label="Duration (Days)"
                placeholder="e.g. 30"
                value={durationDays}
                onChangeText={setDurationDays}
                error={errors.durationDays}
                keyboardType="numeric"
                icon="calendar-outline"
              />

              <Input
                label="Feature List (separated by commas)"
                placeholder="e.g. Locker Rooms, Sauna, 24/7 Access"
                value={featuresInput}
                onChangeText={setFeaturesInput}
                error={errors.features}
                multiline={true}
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
                icon="list-outline"
              />

              {/* Best Value Highlight toggler */}
              <View className="flex-row items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/30 rounded-xl mb-6">
                <View>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">Highlight Tier</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-0.5">Flags as 'Best Choice' ribbon badge</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsHighlighted(!isHighlighted)}
                  className={`w-12 h-6 rounded-full px-1 justify-center ${isHighlighted ? 'bg-primary items-end' : 'bg-gray-300 dark:bg-gray-700 items-start'}`}
                >
                  <View className="w-4.5 h-4.5 bg-white rounded-full" />
                </TouchableOpacity>
              </View>

              <Button
                title={editingPlan ? "Save Plan Changes" : "Create Plan"}
                onPress={handleSavePlan}
                className="rounded-xl mt-2 mb-6"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
