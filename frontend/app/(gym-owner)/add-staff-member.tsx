import React, { useState, useContext, useEffect } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, Clipboard, Modal } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { GymContext } from '../../context/GymContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';
import { formatCurrency } from '../../utils/currencyHelper';

export default function AddStaffMemberScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { initialRole } = useLocalSearchParams();
  const gymContext = useContext(GymContext);

  const activeGymId = user?.gymId;

  // Role selection state
  const [role, setRole] = useState<'trainer' | 'member'>((initialRole as 'trainer' | 'member') || 'trainer');

  // Shared form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Trainer specific states
  const [specialization, setSpecialization] = useState('');
  const [schedule, setSchedule] = useState('06:00 AM - 02:00 PM');

  // Member specific states
  const [dob, setDob] = useState('1995-01-01');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [address, setAddress] = useState('');
  const [membershipPlanId, setMembershipPlanId] = useState('');
  const [assignedTrainerId, setAssignedTrainerId] = useState('');

  // Dropdown UI states
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [trainerModalVisible, setTrainerModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string; code?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Context data
  const memberPlans = gymContext?.memberPlans || [];
  const trainers = gymContext?.trainers || [];

  const gymPlans = memberPlans.filter(p => p.gymId === activeGymId);
  const gymTrainers = trainers.filter(t => t.gymId === activeGymId);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // 1. Reset credentials so form is displayed
      setCreatedCredentials(null);

      // 2. Clear inputs
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setSpecialization('');
      setSchedule('06:00 AM - 02:00 PM');
      setDob('1995-01-01');
      setGender('male');
      setAddress('');
      setAssignedTrainerId('');
      setErrors({});
      setLoading(false);

      // 3. Set correct role on focus
      const activeRole = (initialRole as 'trainer' | 'member') || 'trainer';
      setRole(activeRole);

      // 4. Default plan ID
      if (gymPlans.length > 0) {
        setMembershipPlanId(gymPlans[0].id);
      } else {
        setMembershipPlanId('');
      }
    });

    return unsubscribe;
  }, [navigation, initialRole, gymPlans]);

  useEffect(() => {
    if (gymPlans.length > 0 && !membershipPlanId) {
      setMembershipPlanId(gymPlans[0].id);
    }
  }, [memberPlans, activeGymId]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let newPass = '';
    for (let i = 0; i < 12; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPass);
    toast.success('Random password generated!');
  };

  const handleCreate = async () => {
    setErrors({});
    let tempErrors: Record<string, string> = {};

    if (!fullName.trim()) tempErrors.fullName = 'Full Name is required';
    if (!email.trim()) tempErrors.email = 'Email is required';
    if (!phone.trim()) tempErrors.phone = 'Phone number is required';
    if (!password) tempErrors.password = 'Password is required';

    if (role === 'trainer' && !specialization.trim()) {
      tempErrors.specialization = 'Specialization is required';
    }

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      if (role === 'trainer') {
        const { data, error } = await supabase.functions.invoke('create-trainer', {
          body: {
            email,
            password,
            full_name: fullName,
            phone,
            specialization,
            schedule
          }
        });

        if (error) {
          let errorMsg = error.message || 'Error creating trainer';
          try {
            if (error.context) {
              const body = await error.context.json();
              if (body && body.error) {
                errorMsg = body.error;
              } else if (body && body.message) {
                errorMsg = body.message;
              }
            }
          } catch (_) {}
          throw new Error(errorMsg);
        }
        if (data?.error) throw new Error(data.error);

        // Fetch latest context to sync staff listing
        if (gymContext?.dispatch) {
          gymContext.dispatch({
            type: 'ADD_TRAINER',
            payload: {
              id: data.user_id,
              name: fullName,
              email,
              phone,
              specialization,
              schedule,
              gymId: activeGymId || '',
              memberIds: []
            }
          });
        }

        setCreatedCredentials({ email, pass: password });
        toast.success('Trainer account created successfully!');
      } else {
        const { data, error } = await supabase.functions.invoke('create-member', {
          body: {
            email,
            password,
            full_name: fullName,
            phone,
            date_of_birth: dob,
            gender: gender.charAt(0).toUpperCase() + gender.slice(1), // Match view expected casing
            address,
            membership_plan_id: membershipPlanId,
            assigned_trainer_id: assignedTrainerId || undefined
          }
        });

        if (error) {
          let errorMsg = error.message || 'Error creating member';
          try {
            if (error.context) {
              const body = await error.context.json();
              if (body && body.error) {
                errorMsg = body.error;
              } else if (body && body.message) {
                errorMsg = body.message;
              }
            }
          } catch (_) {}
          throw new Error(errorMsg);
        }
        if (data?.error) throw new Error(data.error);

        // Fetch plan to add details to context member object
        const selectedPlan = gymPlans.find(p => p.id === membershipPlanId);
        const duration = selectedPlan?.durationDays || 30;
        const price = selectedPlan?.price || 0;

        if (gymContext?.dispatch) {
          gymContext.dispatch({
            type: 'ADD_MEMBER',
            payload: {
              id: data.user_id,
              name: fullName,
              email,
              phone,
              dob,
              planId: membershipPlanId,
              startDate: new Date().toISOString(),
              endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active',
              assignedTrainerId: assignedTrainerId || undefined,
              gymId: activeGymId || '',
              gender: gender.charAt(0).toUpperCase() + gender.slice(1) as any,
              membershipId: data.member_code,
              joiningDate: new Date().toISOString().split('T')[0],
              dueAmount: price,
              paidAmount: 0,
              bodyStatsLog: [],
              progressPhotos: []
            }
          });
        }

        setCreatedCredentials({ email, pass: password, code: data.member_code });
        toast.success('Member account created successfully!');
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || 'An unexpected error occurred.';
      try {
        if (err.context) {
          const body = await err.context.json();
          if (body && body.error) {
            errorMsg = body.error;
          } else if (body && body.message) {
            errorMsg = body.message;
          }
        }
      } catch (_) {}
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    let text = `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}`;
    if (createdCredentials.code) {
      text = `Member Code: ${createdCredentials.code}\n` + text;
    }
    Clipboard.setString(text);
    toast.success('Credentials copied to clipboard!');
  };

  const getPlanName = (id: string) => {
    return gymPlans.find(p => p.id === id)?.name || 'Select Plan';
  };

  const getTrainerName = (id: string) => {
    return gymTrainers.find(t => t.id === id)?.name || 'Select Trainer (Optional)';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => router.back()} className="p-2 mr-3 bg-card rounded-full border border-border/10">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text }} className="text-xl font-black">
            {role === 'trainer' ? 'Add Trainer' : 'Add Member'}
          </Text>
        </View>

        {createdCredentials ? (
          <Card className="p-6 items-center border border-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/5 rounded-3xl mb-6">
            <Ionicons name="checkmark-circle" size={48} color="#10B981" className="mb-4" />
            <Text style={{ color: colors.text }} className="text-lg font-black mb-1">
              Account Created Successfully
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center mb-6 max-w-[280px]">
              Copy the credentials below and share them manually with the user.
            </Text>

            <View className="w-full bg-background border border-border p-4 rounded-xl mb-6">
              {createdCredentials.code && (
                <>
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase mb-1">Member Code</Text>
                  <Text style={{ color: colors.text }} className="text-sm font-bold mb-4">{createdCredentials.code}</Text>
                </>
              )}
              <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase mb-1">Email Address</Text>
              <Text style={{ color: colors.text }} className="text-sm font-bold mb-4">{createdCredentials.email}</Text>
              <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase mb-1">Temporary Password</Text>
              <Text style={{ color: colors.text }} className="text-sm font-bold">{createdCredentials.pass}</Text>
            </View>

            <Button
              title="Copy Credentials"
              onPress={copyCredentials}
              className="w-full rounded-xl mb-3"
              style={{ backgroundColor: '#10B981' }}
            />
            <Button
              title="Return to Directory"
              onPress={() => router.back()}
              className="w-full rounded-xl"
              style={{ backgroundColor: '#6C47FF' }}
            />
          </Card>
        ) : (
          <View>
            {/* Role Toggle Selector */}
            {!initialRole && (
              <View className="flex-row bg-card p-1.5 rounded-2xl border border-border/10 mb-6">
                <TouchableOpacity
                  onPress={() => setRole('trainer')}
                  style={{
                    backgroundColor: role === 'trainer' ? '#6C47FF' : 'transparent',
                  }}
                  className="flex-1 py-3 rounded-xl items-center"
                >
                  <Text style={{ color: role === 'trainer' ? '#FFFFFF' : colors.text }} className="text-sm font-bold">
                    Add Trainer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRole('member')}
                  style={{
                    backgroundColor: role === 'member' ? '#6C47FF' : 'transparent',
                  }}
                  className="flex-1 py-3 rounded-xl items-center"
                >
                  <Text style={{ color: role === 'member' ? '#FFFFFF' : colors.text }} className="text-sm font-bold">
                    Add Member
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Basic Info */}
            <Card className="p-5 border border-border/10 rounded-3xl mb-6">
              <Text style={{ color: colors.text }} className="text-sm font-black mb-4">Personal Info</Text>

              <Input
                label="Full Name *"
                placeholder="e.g. John Doe"
                value={fullName}
                onChangeText={setFullName}
                error={errors.fullName}
                icon="person-outline"
              />

              <Input
                label="Email Address *"
                placeholder="e.g. john@member.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                icon="mail-outline"
                autoCapitalize="none"
              />

              <Input
                label="Phone Number *"
                placeholder="e.g. +91 9999999999"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <View className="mb-4">
                <Input
                  label="Password *"
                  placeholder="Set account password"
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                  secureTextEntry={false}
                  icon="lock-closed-outline"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={generatePassword}
                  className="mt-2 flex-row items-center"
                >
                  <Ionicons name="key-outline" size={14} color="#6C47FF" />
                  <Text style={{ color: '#6C47FF' }} className="text-xs font-semibold ml-1.5 underline">
                    Generate Random Password
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Trainer Specific Info */}
            {role === 'trainer' && (
              <Card className="p-5 border border-border/10 rounded-3xl mb-6">
                <Text style={{ color: colors.text }} className="text-sm font-black mb-4">Trainer Specialization & Shift</Text>

                <Input
                  label="Specialization *"
                  placeholder="e.g. Strength & Conditioning"
                  value={specialization}
                  onChangeText={setSpecialization}
                  error={errors.specialization}
                  icon="fitness-outline"
                />

                <Input
                  label="Daily Shift Schedule"
                  placeholder="e.g. 06:00 AM - 02:00 PM"
                  value={schedule}
                  onChangeText={setSchedule}
                  icon="time-outline"
                />
              </Card>
            )}

            {/* Member Specific Info */}
            {role === 'member' && (
              <Card className="p-5 border border-border/10 rounded-3xl mb-6">
                <Text style={{ color: colors.text }} className="text-sm font-black mb-4">Membership Details</Text>

                <Input
                  label="Date of Birth"
                  placeholder="YYYY-MM-DD"
                  value={dob}
                  onChangeText={setDob}
                  icon="calendar-outline"
                />

                {/* Gender Selector */}
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Gender</Text>
                <TouchableOpacity
                  onPress={() => setGenderModalVisible(true)}
                  style={{ borderColor: colors.border, backgroundColor: colors.background }}
                  className="mb-4 py-3 px-4 rounded-xl border flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold capitalize">{gender}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                <Input
                  label="Address"
                  placeholder="Street details"
                  value={address}
                  onChangeText={setAddress}
                  icon="map-outline"
                />

                {/* Plan Dropdown Selector */}
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Select Plan *</Text>
                <TouchableOpacity
                  onPress={() => setPlanModalVisible(true)}
                  style={{ borderColor: colors.border, backgroundColor: colors.background }}
                  className="mb-4 py-3 px-4 rounded-xl border flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{getPlanName(membershipPlanId)}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Trainer Dropdown Selector */}
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Assign Trainer (Optional)</Text>
                <TouchableOpacity
                  onPress={() => setTrainerModalVisible(true)}
                  style={{ borderColor: colors.border, backgroundColor: colors.background }}
                  className="mb-6 py-3 px-4 rounded-xl border flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{getTrainerName(assignedTrainerId)}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </Card>
            )}

            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              style={{ backgroundColor: '#6C47FF' }}
              className="w-full py-4 rounded-xl items-center justify-center shadow-lg active:opacity-90"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Create {role === 'trainer' ? 'Trainer' : 'Member'} Account
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* MODAL FOR GENDER SELECTOR */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={genderModalVisible}
          onRequestClose={() => setGenderModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[40%] border-t border-border">
              <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-border/10">
                <Text style={{ color: colors.text }} className="text-base font-black">Select Gender</Text>
                <TouchableOpacity onPress={() => setGenderModalVisible(false)}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              {['male', 'female', 'other'].map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => {
                    setGender(g as any);
                    setGenderModalVisible(false);
                  }}
                  className="py-3.5 border-b border-border/10"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold capitalize">{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* MODAL FOR PLAN SELECTOR */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={planModalVisible}
          onRequestClose={() => setPlanModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-border">
              <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-border/10">
                <Text style={{ color: colors.text }} className="text-base font-black">Select Gym Plan</Text>
                <TouchableOpacity onPress={() => setPlanModalVisible(false)}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {gymPlans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    onPress={() => {
                      setMembershipPlanId(plan.id);
                      setPlanModalVisible(false);
                    }}
                    className="py-3.5 border-b border-border/10 flex-row justify-between items-center"
                  >
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">{plan.name}</Text>
                    <Text style={{ color: '#00C896' }} className="text-xs font-black">
                      {formatCurrency(plan.price, plan.currency)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL FOR TRAINER SELECTOR */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={trainerModalVisible}
          onRequestClose={() => setTrainerModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-border">
              <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-border/10">
                <Text style={{ color: colors.text }} className="text-base font-black">Assign Trainer</Text>
                <TouchableOpacity onPress={() => setTrainerModalVisible(false)}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                <TouchableOpacity
                  onPress={() => {
                    setAssignedTrainerId('');
                    setTrainerModalVisible(false);
                  }}
                  className="py-3.5 border-b border-border/10"
                >
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-semibold">No Trainer Assignment</Text>
                </TouchableOpacity>
                {gymTrainers.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => {
                      setAssignedTrainerId(t.id);
                      setTrainerModalVisible(false);
                    }}
                    className="py-3.5 border-b border-border/10"
                  >
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
