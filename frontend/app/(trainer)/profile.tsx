import React, { useState, useContext, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Image } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { validateEmail, validateRequired, validatePhone } from '../../utils/validators';
import { Ionicons } from '@expo/vector-icons';
import { Trainer } from '../../types';

export default function TrainerProfileScreen() {
  const { colors, theme, setTheme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { trainers, members, gyms, dispatch } = gymContext;

  const trainerId = user?.id || 'trainer-1';
  const trainer = useMemo(() => trainers.find(t => t.id === trainerId), [trainers, trainerId]);

  const activeGym = useMemo(() => {
    if (!trainer) return null;
    return gyms.find(g => g.id === trainer.gymId);
  }, [trainer, gyms]);

  // Clients assigned count
  const myClientsCount = useMemo(() => {
    if (!trainer) return 0;
    return members.filter(m => m.gymId === trainer.gymId && m.assignedTrainerId === trainer.id).length;
  }, [members, trainer]);

  // Modal control
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Edit Profile States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [schedule, setSchedule] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password Change States
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Notifications State
  const [sessionAlerts, setSessionAlerts] = useState(true);

  const handleOpenEdit = () => {
    if (!trainer) return;
    setName(trainer.name);
    setEmail(trainer.email);
    setPhone(trainer.phone);
    setSpecialization(trainer.specialization);
    setSchedule(trainer.schedule);
    setErrors({});
    setEditModalVisible(true);
  };

  const handleSaveProfile = () => {
    if (!trainer) return;
    const tempErrors: Record<string, string> = {};

    if (!validateRequired(name)) tempErrors.name = "Full name is required.";
    if (!validateRequired(email) || !validateEmail(email)) tempErrors.email = "Input valid email address.";
    if (!validateRequired(phone) || !validatePhone(phone)) tempErrors.phone = "Input valid phone number.";
    if (!validateRequired(specialization)) tempErrors.specialization = "Specialization details required.";
    if (!validateRequired(schedule)) tempErrors.schedule = "Work shift schedule required.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill all fields correctly.");
      return;
    }

    const updatedTrainer: Trainer = {
      ...trainer,
      name,
      email,
      phone,
      specialization,
      schedule
    };

    dispatch({ type: 'UPDATE_TRAINER', payload: updatedTrainer });
    toast.success("Profile updated successfully!");
    setEditModalVisible(false);
  };

  const handleChangePassword = () => {
    if (!currentPass || !newPass) {
      toast.error("Please fill both password fields.");
      return;
    }
    if (newPass.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    toast.success("Security credentials updated!");
    setCurrentPass('');
    setNewPass('');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      {/* Profile Header Summary Card */}
      {trainer && (
        <Card className="mb-6 items-center p-6">
          <Avatar name={trainer.name} size={80} />
          <Text style={{ color: colors.text }} className="text-xl font-black mt-3">
            {trainer.name}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">
            {trainer.email}
          </Text>
          <View className="mt-2.5 flex-row items-center bg-primary/10 px-3 py-1 rounded-full">
            <Ionicons name="shield-checkmark" size={12} color="#6C47FF" className="mr-1" />
            <Text className="text-[10px] font-black uppercase text-primary tracking-wide">
              Certified Fitness Coach
            </Text>
          </View>
        </Card>
      )}

      {/* Professional Stats */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Roster Stats</Text>
      <View className="flex-row gap-4 mb-6">
        <Card className="flex-1 p-4 items-center">
          <Ionicons name="people" size={24} color="#6C47FF" className="mb-1" />
          <Text style={{ color: colors.text }} className="text-lg font-black">{myClientsCount}</Text>
          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider text-center mt-0.5">
            Active Clients
          </Text>
        </Card>
        <Card className="flex-1 p-4 items-center">
          <Ionicons name="business" size={24} color="#00C896" className="mb-1" />
          <Text style={{ color: colors.text }} className="text-xs font-black text-center" numberOfLines={1}>
            {activeGym?.name || "FitZone Main"}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider text-center mt-1">
            Active Hub
          </Text>
        </Card>
      </View>

      {/* Trainer Professional Profile Info */}
      <View className="flex-row justify-between items-center mb-3">
        <Text style={{ color: colors.text }} className="text-lg font-black">Coaching Credentials</Text>
        <TouchableOpacity
          onPress={handleOpenEdit}
          className="bg-primary/10 px-3.5 py-1.5 rounded-xl flex-row items-center"
        >
          <Ionicons name="create-outline" size={14} color="#6C47FF" className="mr-1" />
          <Text className="text-primary font-bold text-xs uppercase">Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {trainer && (
        <Card className="mb-6 p-4 space-y-3.5">
          <View className="flex-row justify-between">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Specialization</Text>
            <Text style={{ color: colors.text }} className="text-xs font-black text-right max-w-[60%]">
              {trainer.specialization}
            </Text>
          </View>
          <View className="flex-row justify-between mt-2.5">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Shift Schedule</Text>
            <Text style={{ color: colors.text }} className="text-xs font-semibold">
              {trainer.schedule}
            </Text>
          </View>
          <View className="flex-row justify-between mt-2.5">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Contact Mobile</Text>
            <Text style={{ color: colors.text }} className="text-xs font-semibold">
              {trainer.phone}
            </Text>
          </View>
        </Card>
      )}

      {/* Theme Settings */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Theme Preferences</Text>
      <Card className="mb-6 p-4">
        <View className="flex-row justify-between">
          {(['light', 'dark', 'oled'] as const).map((tMode) => (
            <TouchableOpacity
              key={tMode}
              onPress={() => setTheme(tMode)}
              style={{
                borderColor: theme === tMode ? '#6C47FF' : colors.border,
                backgroundColor: theme === tMode ? 'rgba(108,71,255,0.08)' : 'transparent'
              }}
              className="w-[30%] py-3 rounded-xl border items-center justify-center flex-row capitalize"
            >
              <Ionicons
                name={
                  tMode === 'light'
                    ? "sunny-outline"
                    : tMode === 'dark'
                    ? "moon-outline"
                    : "phone-portrait-outline"
                }
                size={16}
                color={theme === tMode ? '#6C47FF' : colors.textSecondary}
                className="mr-1.5"
              />
              <Text style={{ color: theme === tMode ? '#6C47FF' : colors.text }} className="text-xs font-bold">
                {tMode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Security Passwords Panel */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Security & Passwords</Text>
      <Card className="mb-6">
        <Input
          label="Current Password"
          secureTextEntry={true}
          value={currentPass}
          onChangeText={setCurrentPass}
          icon="lock-closed-outline"
        />

        <Input
          label="New Password"
          placeholder="Min 6 characters"
          secureTextEntry={true}
          value={newPass}
          onChangeText={setNewPass}
          icon="lock-open-outline"
        />

        <Button
          title="Change Password"
          onPress={handleChangePassword}
          variant="outline"
          className="rounded-xl"
        />
      </Card>

      {/* Notification Preferences */}
      <Card className="mb-2 p-4 flex-row justify-between items-center">
        <View>
          <Text style={{ color: colors.text }} className="text-xs font-bold">Session Reminders</Text>
          <Text style={{ color: colors.textSecondary }} className="text-[9px] font-semibold mt-0.5">
            Receive push notices before client sessions
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setSessionAlerts(!sessionAlerts);
            toast.success(sessionAlerts ? "Disabled reminders." : "Enabled reminders!");
          }}
          className={`w-12 h-6 rounded-full px-1 justify-center ${
            sessionAlerts ? 'bg-primary items-end' : 'bg-gray-300 dark:bg-gray-700 items-start'
          }`}
        >
          <View className="w-4.5 h-4.5 bg-white rounded-full" />
        </TouchableOpacity>
      </Card>

      {/* EDIT PROFILE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Edit Coaching Profile
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                error={errors.name}
                icon="person-outline"
              />

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
              />

              <Input
                label="Contact Number"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <Input
                label="Coaching Specialization"
                value={specialization}
                onChangeText={setSpecialization}
                error={errors.specialization}
                icon="trophy-outline"
              />

              <Input
                label="Shift Hours"
                value={schedule}
                onChangeText={setSchedule}
                error={errors.schedule}
                icon="time-outline"
              />

              <Button
                title="Save Changes"
                onPress={handleSaveProfile}
                className="rounded-xl mt-4 mb-6"
                style={{ backgroundColor: '#6C47FF' }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
