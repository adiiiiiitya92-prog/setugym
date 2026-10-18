import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { validateEmail, validateRequired, validatePhone } from '../../utils/validators';
import { Trainer, Member } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export default function StaffScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { trainers, members, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal displays
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [schedule, setSchedule] = useState('06:00 AM - 02:00 PM');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Assign specific states
  const [assignMemberId, setAssignMemberId] = useState('');

  // 1. Filter gym branch trainers
  const gymTrainers = useMemo(() => trainers.filter(t => t.gymId === activeGymId), [trainers, activeGymId]);
  const gymMembers = useMemo(() => members.filter(m => m.gymId === activeGymId), [members, activeGymId]);

  // 2. Search query filtration
  const searchedTrainers = useSearch(gymTrainers, searchQuery, ['name', 'specialization', 'phone']);

  const getTrainerMembers = (trainer: Trainer): Member[] => {
    // Return members assigned to this trainer
    return members.filter(m => m.assignedTrainerId === trainer.id);
  };

  const handleOpenDetails = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setDetailModalVisible(true);
  };

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setPhone('');
    setSpecialization('');
    setSchedule('06:00 AM - 02:00 PM');
    setErrors({});
    setAddModalVisible(true);
  };

  const handleAddTrainer = () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(name)) tempErrors.name = "Full name is required.";
    if (!validateRequired(email) || !validateEmail(email)) tempErrors.email = "Input valid email address.";
    if (!validateRequired(phone) || !validatePhone(phone)) tempErrors.phone = "Input valid phone number.";
    if (!validateRequired(specialization)) tempErrors.specialization = "Specialization details required.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill all mandatory fields.");
      return;
    }

    const newTrainerId = `trainer-${Date.now()}`;
    const newTrainer: Trainer = {
      id: newTrainerId,
      name,
      email,
      phone,
      specialization,
      schedule,
      gymId: activeGymId,
      memberIds: []
    };

    dispatch({ type: 'ADD_TRAINER', payload: newTrainer });
    toast.success(`Trainer ${name} added successfully!`);
    setAddModalVisible(false);
  };

  const handleOpenAssign = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    // Find first member not assigned or choose first in gym
    const unassigned = gymMembers.filter(m => m.assignedTrainerId !== trainer.id);
    setAssignMemberId(unassigned[0]?.id || '');
    setDetailModalVisible(false);
    setAssignModalVisible(true);
  };

  const handleAssignMember = () => {
    if (!selectedTrainer || !assignMemberId) return;
    dispatch({
      type: 'ASSIGN_TRAINER',
      payload: {
        memberId: assignMemberId,
        trainerId: selectedTrainer.id
      }
    });
    const mName = members.find(m => m.id === assignMemberId)?.name;
    toast.success(`Assigned member ${mName} to Mike ${selectedTrainer.name}`);
    setAssignModalVisible(false);
  };

  const handleDeleteTrainer = (trainerId: string, trainerName: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete trainer ${trainerName}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            dispatch({ type: 'DELETE_TRAINER', payload: trainerId });
            toast.error("Trainer removed.");
            setDetailModalVisible(false);
          }
        }
      ]
    );
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
        placeholder="Search trainers by name or specialization..."
      />

      <FlatList
        data={searchedTrainers}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => {
          const count = getTrainerMembers(item).length;
          return (
            <Card onPress={() => handleOpenDetails(item)} className="mb-4">
              <View className="flex-row items-center mb-3">
                <Avatar name={item.name} size={44} />
                <View className="ml-3 flex-1">
                  <Text style={{ color: colors.text }} className="text-base font-extrabold">
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">
                    {item.specialization}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                <View>
                  <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Schedule Shift</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-bold mt-0.5">{item.schedule}</Text>
                </View>
                <View className="items-end bg-primary/5 px-2.5 py-1 rounded-xl justify-center">
                  <Text style={{ color: '#6C47FF' }} className="text-[10px] font-black uppercase tracking-wider">
                    {count} Active Clients
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">🏋️‍♂️</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Trainers Found</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
              Tap the FAB below to register a new trainer to your staff directory!
            </Text>
          </Card>
        }
      />

      {/* Floating FAB trigger */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/(gym-owner)/add-staff-member', params: { initialRole: 'trainer' } })}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* DETAILED DRILLDOWN MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            {selectedTrainer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-5">
                  <Text style={{ color: colors.text }} className="text-xl font-black">
                    Trainer Details
                  </Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="p-1">
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View className="items-center mb-6">
                  <Avatar name={selectedTrainer.name} size={64} />
                  <Text style={{ color: colors.text }} className="text-lg font-black mt-3">
                    {selectedTrainer.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">
                    {selectedTrainer.specialization}
                  </Text>
                </View>

                <View className="space-y-3.5 mb-6">
                  <View className="flex-row justify-between">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Email address</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{selectedTrainer.email}</Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Phone number</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{selectedTrainer.phone}</Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Assigned schedule</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-semibold">{selectedTrainer.schedule}</Text>
                  </View>
                </View>

                {/* Assigned Member List */}
                <Text style={{ color: colors.text }} className="text-sm font-black mb-3">Assigned Clients ({getTrainerMembers(selectedTrainer).length})</Text>
                <View className="mb-6 space-y-2">
                  {getTrainerMembers(selectedTrainer).length === 0 ? (
                    <Card className="items-center py-4 bg-gray-50/50 dark:bg-gray-800/10">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No assigned members yet.</Text>
                    </Card>
                  ) : (
                    getTrainerMembers(selectedTrainer).map(m => (
                      <View key={m.id} className="flex-row justify-between bg-gray-50/50 dark:bg-gray-800/20 p-2.5 rounded-lg items-center">
                        <Text style={{ color: colors.text }} className="text-xs font-bold">{m.name}</Text>
                        <Badge status={m.status} style={{ paddingVertical: 1, paddingHorizontal: 6 }} />
                      </View>
                    ))
                  )}
                </View>

                <View className="space-y-3">
                  <View className="flex-row gap-3">
                    <Button
                      title="Assign Client"
                      onPress={() => handleOpenAssign(selectedTrainer)}
                      className="flex-1 rounded-xl"
                    />
                    <Button
                      title="Delete Trainer"
                      variant="accent"
                      onPress={() => handleDeleteTrainer(selectedTrainer.id, selectedTrainer.name)}
                      className="flex-1 rounded-xl"
                    />
                  </View>
                  <Button
                    title="Close Details"
                    variant="outline"
                    onPress={() => setDetailModalVisible(false)}
                    className="w-full rounded-xl"
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* TRAINER REGISTRATION MODAL FORM */}
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
                Register Gym Trainer
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name"
                placeholder="e.g. Mike Ironson"
                value={name}
                onChangeText={setName}
                error={errors.name}
                icon="person-outline"
              />

              <Input
                label="Email Address"
                placeholder="e.g. mike@fitzone.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
              />

              <Input
                label="Phone Number"
                placeholder="e.g. +1 555-765-4321"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <Input
                label="Professional Specialization"
                placeholder="e.g. Hypertrophy & Strength"
                value={specialization}
                onChangeText={setSpecialization}
                error={errors.specialization}
                icon="trophy-outline"
              />

              <Input
                label="Schedule Hours"
                placeholder="e.g. 06:00 AM - 02:00 PM"
                value={schedule}
                onChangeText={setSchedule}
                icon="time-outline"
              />

              <Button
                title="Create Trainer Profile"
                onPress={handleAddTrainer}
                className="rounded-xl mt-4 mb-6"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ASSIGN MEMBER MODAL FORM */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
            <Text style={{ color: colors.text }} className="text-lg font-black mb-2 text-center">Assign Client</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs mb-5 text-center font-medium">Select a gym member to assign to {selectedTrainer?.name}:</Text>
            
            <View className="mb-6 space-y-2">
              {gymMembers.filter(m => m.assignedTrainerId !== selectedTrainer?.id).length === 0 ? (
                <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-semibold py-4">All branch members are already assigned to this trainer.</Text>
              ) : (
                gymMembers.filter(m => m.assignedTrainerId !== selectedTrainer?.id).map((m) => (
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
                ))
              )}
            </View>

            <View className="flex-row gap-3">
              <Button title="Cancel" variant="outline" onPress={() => setAssignModalVisible(false)} className="flex-1 rounded-xl" />
              <Button 
                title="Assign" 
                onPress={handleAssignMember} 
                disabled={!assignMemberId}
                className="flex-1 rounded-xl" 
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
