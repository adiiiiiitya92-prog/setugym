import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { validateEmail, validateRequired } from '../../utils/validators';
import { Ionicons } from '@expo/vector-icons';

export default function PlatformSettingsScreen() {
  const { colors, theme, setTheme } = useTheme();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { settings, dispatch } = gymContext;

  // Form states
  const [appName, setAppName] = useState(settings.appName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [trialDuration, setTrialDuration] = useState(settings.trialDurationDays.toString());
  const [gatewayActive, setGatewayActive] = useState(settings.paymentGatewayActive);

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSaveSettings = () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(appName)) tempErrors.appName = "Platform name is required.";
    if (!validateRequired(supportEmail)) {
      tempErrors.supportEmail = "Support email is required.";
    } else if (!validateEmail(supportEmail)) {
      tempErrors.supportEmail = "Please enter a valid email.";
    }
    if (!validateRequired(trialDuration) || isNaN(Number(trialDuration))) {
      tempErrors.trialDuration = "Please enter a valid number.";
    }

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill all mandatory fields.");
      return;
    }

    dispatch({
      type: 'UPDATE_PLATFORM_SETTINGS',
      payload: {
        appName,
        supportEmail,
        trialDurationDays: Number(trialDuration),
        paymentGatewayActive: gatewayActive
      }
    });

    toast.success("Platform settings saved successfully!");
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please fill both password fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    toast.success("Password updated successfully!");
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <View className="mb-6 mt-1">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
          ADMIN CONFIGURATION
        </Text>
        <Text style={{ color: colors.text }} className="text-3xl font-black tracking-tight mt-1">
          Settings
        </Text>
      </View>

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

      {/* Platform configuration */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">App Configuration</Text>
      <Card className="mb-6">
        <Input
          label="Application Platform Name"
          value={appName}
          onChangeText={setAppName}
          error={errors.appName}
          icon="phone-portrait-outline"
        />

        <Input
          label="Primary Support Email"
          value={supportEmail}
          onChangeText={setSupportEmail}
          error={errors.supportEmail}
          keyboardType="email-address"
          icon="mail-outline"
        />

        <Input
          label="Default Gym Trial Duration (Days)"
          value={trialDuration}
          onChangeText={setTrialDuration}
          error={errors.trialDuration}
          keyboardType="numeric"
          icon="time-outline"
        />

        <View className="flex-row items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/30 rounded-xl mb-6">
          <View>
            <Text style={{ color: colors.text }} className="text-xs font-bold">Stripe Payment Gateway</Text>
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-0.5">Toggle live billing transactions</Text>
          </View>
          <TouchableOpacity
            onPress={() => setGatewayActive(!gatewayActive)}
            className={`w-12 h-6 rounded-full px-1 justify-center ${gatewayActive ? 'bg-primary items-end' : 'bg-gray-300 dark:bg-gray-700 items-start'}`}
          >
            <View className="w-4.5 h-4.5 bg-white rounded-full" />
          </TouchableOpacity>
        </View>

        <Button
          title="Save Configuration"
          onPress={handleSaveSettings}
          className="rounded-xl"
        />
      </Card>

      {/* Change Password security */}
      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Security & Passwords</Text>
      <Card className="mb-2">
        <Input
          label="Current Password"
          placeholder="••••••••"
          secureTextEntry={true}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          icon="lock-closed-outline"
        />

        <Input
          label="New Password"
          placeholder="Min 6 characters"
          secureTextEntry={true}
          value={newPassword}
          onChangeText={setNewPassword}
          icon="lock-open-outline"
        />

        <Button
          title="Change Password"
          onPress={handleChangePassword}
          variant="outline"
          className="rounded-xl"
        />
      </Card>
    </ScrollView>
  );
}
