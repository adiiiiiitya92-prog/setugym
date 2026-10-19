import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, Clipboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';

export default function AddGymOwnerScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [gymName, setGymName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!gymName.trim()) tempErrors.gymName = 'Gym name is required';
    if (!addressLine1.trim()) tempErrors.addressLine1 = 'Address line 1 is required';
    if (!city.trim()) tempErrors.city = 'City is required';
    if (!state.trim()) tempErrors.state = 'State is required';
    if (!pincode.trim()) tempErrors.pincode = 'Pincode is required';

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-gym-owner', {
        body: {
          email,
          password,
          full_name: fullName,
          phone,
          gym_name: gymName,
          address_line1: addressLine1,
          city,
          state,
          pincode
        }
      });

      if (error) {
        let errorMsg = error.message || 'Error creating gym owner';
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

      if (data?.error) {
        throw new Error(data.error);
      }

      setCreatedCredentials({ email, pass: password });
      toast.success('Gym Owner registered successfully!');
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
    const text = `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}`;
    Clipboard.setString(text);
    toast.success('Credentials copied to clipboard!');
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
            Add Gym Owner
          </Text>
        </View>

        {createdCredentials ? (
          <Card className="p-6 items-center border border-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/5 rounded-3xl mb-6">
            <Ionicons name="checkmark-circle" size={48} color="#10B981" className="mb-4" />
            <Text style={{ color: colors.text }} className="text-lg font-black mb-1">
              Account Created Successfully
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center mb-6 max-w-[280px]">
              Copy the credentials below and share them manually. There is no self-signup available.
            </Text>

            <View className="w-full bg-background border border-border p-4 rounded-xl mb-6">
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
              title="Return to Dashboard"
              onPress={() => router.replace('/(super-admin)/dashboard')}
              className="w-full rounded-xl"
              style={{ backgroundColor: '#6C47FF' }}
            />
          </Card>
        ) : (
          <View>
            <Card className="p-5 border border-border/10 rounded-3xl mb-6">
              <Text style={{ color: colors.text }} className="text-sm font-black mb-4">Owner Personal Info</Text>
              
              <Input
                label="Full Name *"
                placeholder="e.g. Rajesh Singhania"
                value={fullName}
                onChangeText={setFullName}
                error={errors.fullName}
                icon="person-outline"
              />

              <Input
                label="Email Address *"
                placeholder="e.g. owner@gym.com"
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

            <Card className="p-5 border border-border/10 rounded-3xl mb-6">
              <Text style={{ color: colors.text }} className="text-sm font-black mb-4">Gym Branch Details</Text>

              <Input
                label="Gym Name *"
                placeholder="e.g. Gold Gym Branch 1"
                value={gymName}
                onChangeText={setGymName}
                error={errors.gymName}
                icon="business-outline"
              />

              <Input
                label="Address Line 1 *"
                placeholder="e.g. 123 Main St, Sector 4"
                value={addressLine1}
                onChangeText={setAddressLine1}
                error={errors.addressLine1}
                icon="map-outline"
              />

              <Input
                label="City *"
                placeholder="e.g. New Delhi"
                value={city}
                onChangeText={setCity}
                error={errors.city}
                icon="navigate-outline"
              />

              <Input
                label="State *"
                placeholder="e.g. Delhi"
                value={state}
                onChangeText={setState}
                error={errors.state}
                icon="globe-outline"
              />

              <Input
                label="Pincode *"
                placeholder="e.g. 110001"
                value={pincode}
                onChangeText={setPincode}
                error={errors.pincode}
                keyboardType="number-pad"
                icon="pin-outline"
              />
            </Card>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              style={{ backgroundColor: '#6C47FF' }}
              className="w-full py-4 rounded-xl items-center justify-center shadow-lg active:opacity-90"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-bold text-base">Create Gym Owner Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
