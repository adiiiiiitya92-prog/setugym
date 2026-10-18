import React, { useState, useContext, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/dateHelper';
import { Ionicons } from '@expo/vector-icons';
import { BodyStat } from '../../types';

export default function MemberProfileScreen() {
  const { colors, theme, setTheme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { members, trainers, memberPlans, dispatch } = gymContext;

  const memberId = user?.id || 'member-john';
  const member = useMemo(() => members.find(m => m.id === memberId), [members, memberId]);
  
  const trainer = useMemo(() => {
    if (!member || !member.assignedTrainerId) return null;
    return trainers.find(t => t.id === member.assignedTrainerId);
  }, [member, trainers]);

  const plan = useMemo(() => {
    if (!member) return null;
    return memberPlans.find(p => p.id === member.planId);
  }, [member, memberPlans]);

  // Modal states
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  // Stats form states
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');

  // Password states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Notifications settings toggler
  const [notifsEnabled, setNotifsEnabled] = useState(true);

  // Body stats logger handler
  const handleSaveStats = () => {
    if (!weight || !height || !chest || !waist || !hips) {
      toast.error("Please fill all mandatory stat fields.");
      return;
    }

    const wNum = Number(weight);
    const hNum = Number(height);
    const cNum = Number(chest);
    const waNum = Number(waist);
    const hiNum = Number(hips);

    if (isNaN(wNum) || isNaN(hNum) || isNaN(cNum) || isNaN(waNum) || isNaN(hiNum)) {
      toast.error("Enter valid numeric stats.");
      return;
    }

    // Auto BMI calculation: weight (kg) / (height(m) * height(m))
    const heightInMeters = hNum / 100;
    const bmiVal = Number((wNum / (heightInMeters * heightInMeters)).toFixed(1));

    const newStat: BodyStat = {
      date: formatDate(new Date(), "yyyy-MM-dd"),
      weight: wNum,
      height: hNum,
      bmi: bmiVal,
      chest: cNum,
      waist: waNum,
      hips: hiNum
    };

    dispatch({
      type: 'RECORD_BODY_STATS',
      payload: { memberId, stat: newStat }
    });

    toast.success(`Registered stats log! Automated BMI resolved at: ${bmiVal}`);
    setStatsModalVisible(false);
    
    // Reset fields
    setWeight('');
    setHeight('');
    setChest('');
    setWaist('');
    setHips('');
  };

  const handleChangePassword = () => {
    if (!currentPass || !newPass) {
      toast.error("Please fill both password fields.");
      return;
    }
    toast.success("Password security settings saved successfully!");
    setCurrentPass('');
    setNewPass('');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      {/* Profile summary card */}
      {member && (
        <Card className="mb-6 items-center p-6">
          <Avatar name={member.name} uri={member.photoUrl} size={70} />
          <Text style={{ color: colors.text }} className="text-xl font-black mt-3">{member.name}</Text>
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">{member.email}</Text>
          <Badge status={member.status} style={{ marginTop: 8 }} />
        </Card>
      )}

      {/* Theme Toggles */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Theme Preferences</Text>
      <Card className="mb-6 p-4">
        <View className="flex-row justify-between">
          <TouchableOpacity
            onPress={() => setTheme('light')}
            style={{
              borderColor: theme === 'light' ? '#6C47FF' : colors.border,
              backgroundColor: theme === 'light' ? 'rgba(108,71,255,0.08)' : 'transparent'
            }}
            className="w-[30%] py-3 rounded-xl border items-center justify-center flex-row"
          >
            <Ionicons name="sunny-outline" size={16} color={theme === 'light' ? '#6C47FF' : colors.textSecondary} className="mr-1.5" />
            <Text style={{ color: theme === 'light' ? '#6C47FF' : colors.text }} className="text-xs font-bold">Light</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTheme('dark')}
            style={{
              borderColor: theme === 'dark' ? '#6C47FF' : colors.border,
              backgroundColor: theme === 'dark' ? 'rgba(108,71,255,0.08)' : 'transparent'
            }}
            className="w-[30%] py-3 rounded-xl border items-center justify-center flex-row"
          >
            <Ionicons name="moon-outline" size={16} color={theme === 'dark' ? '#6C47FF' : colors.textSecondary} className="mr-1.5" />
            <Text style={{ color: theme === 'dark' ? '#6C47FF' : colors.text }} className="text-xs font-bold">Dark</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTheme('oled')}
            style={{
              borderColor: theme === 'oled' ? '#6C47FF' : colors.border,
              backgroundColor: theme === 'oled' ? 'rgba(108,71,255,0.08)' : 'transparent'
            }}
            className="w-[30%] py-3 rounded-xl border items-center justify-center flex-row"
          >
            <Ionicons name="phone-portrait-outline" size={16} color={theme === 'oled' ? '#6C47FF' : colors.textSecondary} className="mr-1.5" />
            <Text style={{ color: theme === 'oled' ? '#6C47FF' : colors.text }} className="text-xs font-bold">OLED</Text>
          </TouchableOpacity>
        </View>
      </Card>


      {/* Body Stats Logger panel */}
      <View className="flex-row justify-between items-center mb-3">
        <Text style={{ color: colors.text }} className="text-lg font-black">Body Stats Tracker</Text>
        <TouchableOpacity
          onPress={() => setStatsModalVisible(true)}
          className="bg-secondary/10 px-3.5 py-1.5 rounded-xl flex-row items-center"
        >
          <Ionicons name="create-outline" size={14} color="#00C896" className="mr-1" />
          <Text className="text-secondary font-bold text-xs uppercase">Log Stats</Text>
        </TouchableOpacity>
      </View>

      <Card className="mb-6 p-4">
        {member?.bodyStatsLog && member.bodyStatsLog.length > 0 ? (
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Weight Trend</Text>
              <Text style={{ color: colors.text }} className="text-xs font-black">{member.bodyStatsLog[0].weight} kg</Text>
            </View>
            <View className="flex-row justify-between mt-1">
              <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Stat Height</Text>
              <Text style={{ color: colors.text }} className="text-xs font-semibold">{member.bodyStatsLog[0].height} cm</Text>
            </View>
            <View className="flex-row justify-between mt-1">
              <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Resolved BMI</Text>
              <Text style={{ color: '#00C896' }} className="text-xs font-black">{member.bodyStatsLog[0].bmi}</Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.textSecondary }} className="text-xs text-center py-4">No body metrics registered yet.</Text>
        )}
      </Card>

      {/* Assigned Coach details */}
      {trainer && (
        <View className="mb-6">
          <Text style={{ color: colors.text }} className="text-lg font-black mb-3">My Personal Coach</Text>
          <Card className="p-4 flex-row items-center">
            <Avatar name={trainer.name} size={44} />
            <View className="ml-3 flex-1">
              <Text style={{ color: colors.text }} className="text-sm font-black">{trainer.name}</Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">{trainer.specialization}</Text>
              <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-1 font-semibold">Shift: {trainer.schedule}</Text>
            </View>
          </Card>
        </View>
      )}

      {/* Account Settings details */}
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

      {/* Notification toggles */}
      <Card className="mb-2 p-4 flex-row justify-between items-center">
        <View>
          <Text style={{ color: colors.text }} className="text-xs font-bold">Push Notifications</Text>
          <Text style={{ color: colors.textSecondary }} className="text-[9px] font-semibold mt-0.5">Toggle membership expiry push alerts</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setNotifsEnabled(!notifsEnabled);
            toast.success(notifsEnabled ? "Disabled expiry alerts." : "Enabled expiry push alerts!");
          }}
          className={`w-12 h-6 rounded-full px-1 justify-center ${notifsEnabled ? 'bg-primary items-end' : 'bg-gray-300 dark:bg-gray-700 items-start'}`}
        >
          <View className="w-4.5 h-4.5 bg-white rounded-full" />
        </TouchableOpacity>
      </Card>

      {/* BODY STATS LOG MODAL FORM */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={statsModalVisible}
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Log Body Metrics
              </Text>
              <TouchableOpacity onPress={() => setStatsModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between gap-3">
                <View className="flex-1">
                  <Input
                    label="Weight (kg)"
                    placeholder="e.g. 78.5"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    icon="flame-outline"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Height (cm)"
                    placeholder="e.g. 178"
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    icon="resize-outline"
                  />
                </View>
              </View>

              <Input
                label="Chest Size (inches)"
                placeholder="e.g. 39.5"
                value={chest}
                onChangeText={setChest}
                keyboardType="numeric"
                icon="barbell-outline"
              />

              <Input
                label="Waist Size (inches)"
                placeholder="e.g. 32.5"
                value={waist}
                onChangeText={setWaist}
                keyboardType="numeric"
                icon="ellipse-outline"
              />

              <Input
                label="Hips Size (inches)"
                placeholder="e.g. 37.5"
                value={hips}
                onChangeText={setHips}
                keyboardType="numeric"
                icon="ellipse-outline"
              />

              <Button
                title="Log Metrics & Auto Calc BMI"
                onPress={handleSaveStats}
                className="rounded-xl mt-4 mb-6"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
