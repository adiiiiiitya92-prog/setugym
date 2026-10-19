import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Image } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { validateEmail, validateRequired } from '../../utils/validators';
import { STRINGS } from '../../constants/strings';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { colors, theme } = useTheme();
  const { login, authenticateWithBiometrics, hasBiometricsHardware, biometricsEnabled, setBiometricsEnabled } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form error states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Handle biometric entry automatically on mount if enabled
  useEffect(() => {
    if (biometricsEnabled && hasBiometricsHardware) {
      setTimeout(() => {
        handleBiometricLogin();
      }, 500);
    }
  }, [biometricsEnabled, hasBiometricsHardware]);

  const handleBiometricLogin = async () => {
    const result = await authenticateWithBiometrics();
    if (result.success) {
      toast.success("Successfully logged in via biometrics!");
    } else if (result.error && result.error !== "Verification canceled or failed.") {
      toast.info(result.error);
    }
  };

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');

    let valid = true;
    if (!validateRequired(email)) {
      setEmailError("Email address is required.");
      valid = false;
    } else if (!validateEmail(email)) {
      setEmailError(STRINGS.auth.errorEmailInvalid);
      valid = false;
    }

    if (!validateRequired(password)) {
      setPasswordError(STRINGS.auth.errorPasswordRequired);
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success("Welcome back to SetuGym!");
    } else {
      toast.error(result.error || STRINGS.auth.errorInvalidCredentials);
    }
  };

  // Quick Demo logins instant 1-tap helper
  const handleQuickLogin = async (role: 'admin' | 'owner' | 'trainer' | 'member') => {
    let targetEmail = "";
    let targetPassword = "";
    let roleName = "";

    switch (role) {
      case 'admin':
        targetEmail = "admin@gymapp.com";
        targetPassword = "Admin@123";
        roleName = "Super Admin";
        break;
      case 'owner':
        targetEmail = "owner@fitzone.com";
        targetPassword = "Owner@123";
        roleName = "Gym Owner";
        break;
      case 'trainer':
        targetEmail = "trainer@fitzone.com";
        targetPassword = "Trainer@123";
        roleName = "Trainer";
        break;
      case 'member':
        targetEmail = "john@member.com";
        targetPassword = "Member@123";
        roleName = "Member";
        break;
    }

    setEmail(targetEmail);
    setPassword(targetPassword);
    setEmailError("");
    setPasswordError("");

    setLoading(true);
    const result = await login(targetEmail, targetPassword);
    setLoading(false);

    if (result.success) {
      toast.success(`Welcome to ${roleName} Panel!`);
    } else {
      toast.error(result.error || STRINGS.auth.errorInvalidCredentials);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View className="items-center mb-8">
          <Image 
            source={require('../../assets/setu gym logo s.png')} 
            style={{ width: 120, height: 120, borderRadius: 24 }} 
            className="mb-4"
            resizeMode="contain"
          />
          <Text style={{ color: colors.text }} className="text-3xl font-extrabold tracking-tight">
            {STRINGS.app.name}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mt-1">
            {STRINGS.app.tagline}
          </Text>
        </View>

        {/* Card Panel wrapper */}
        <View 
          style={{ backgroundColor: colors.card, borderColor: colors.border }} 
          className="p-6 rounded-3xl border shadow-xl"
        >
          <Text style={{ color: colors.text }} className="text-xl font-bold mb-1">
            {STRINGS.auth.loginTitle}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-xs mb-6 font-medium">
            {STRINGS.auth.loginSubtitle}
          </Text>

          {/* Email input field */}
          <View className="mb-4">
            <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2">
              Email Address
            </Text>
            <View 
              style={{ backgroundColor: colors.background, borderColor: emailError ? colors.accent : colors.border }} 
              className="flex-row items-center px-4 py-3 rounded-xl border"
            >
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={STRINGS.auth.emailPlaceholder}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ color: colors.text, flex: 1, marginLeft: 12, paddingVertical: 0 }}
              />
            </View>
            {emailError ? (
              <Text style={{ color: colors.accent }} className="text-[11px] font-medium mt-1 pl-1">
                {emailError}
              </Text>
            ) : null}
          </View>

          {/* Password Input field */}
          <View className="mb-6">
            <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2">
              Password
            </Text>
            <View 
              style={{ backgroundColor: colors.background, borderColor: passwordError ? colors.accent : colors.border }} 
              className="flex-row items-center px-4 py-3 rounded-xl border"
            >
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={STRINGS.auth.passwordPlaceholder}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={secureText}
                style={{ color: colors.text, flex: 1, marginLeft: 12, paddingVertical: 0 }}
              />
              <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                <Ionicons name={secureText ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={{ color: colors.accent }} className="text-[11px] font-medium mt-1 pl-1">
                {passwordError}
              </Text>
            ) : null}
          </View>

          {/* Submit Action */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{ backgroundColor: '#6C47FF' }}
            className="w-full py-3.5 rounded-xl items-center justify-center shadow-lg shadow-primary/30 active:opacity-90"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white font-bold text-base">{STRINGS.auth.signInButton}</Text>
            )}
          </TouchableOpacity>

          {/* Biometrics triggers if enabled */}
          {hasBiometricsHardware && (
            <View className="mt-5 items-center">
              <TouchableOpacity
                onPress={handleBiometricLogin}
                className="flex-row items-center justify-center p-2 rounded-xl"
              >
                <Ionicons name="finger-print" size={26} color="#00C896" />
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold ml-2">
                  {STRINGS.auth.biometricHint}
                </Text>
              </TouchableOpacity>
              
              {/* Easy settings toggler */}
              <TouchableOpacity
                onPress={() => setBiometricsEnabled(!biometricsEnabled)}
                className="mt-2"
              >
                <Text style={{ color: '#6C47FF' }} className="text-[10px] font-semibold underline">
                  {biometricsEnabled ? "Disable Auto Biometrics" : "Enable TouchID Auto Sign-In"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Demo profiles quick selection board */}
        <View className="mt-8">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold text-center mb-3">
            QUICK ACCESS DEMO LOGINS
          </Text>
            <View className="flex-row flex-wrap justify-between gap-y-2">
              <TouchableOpacity
                onPress={() => handleQuickLogin('admin')}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="w-[48%] py-2.5 px-3 rounded-xl border items-center flex-row"
              >
                <View className="w-2.5 h-2.5 rounded-full bg-accent mr-2" />
                <View>
                  <Text style={{ color: colors.text }} className="text-[11px] font-bold">Vikramaditya S.</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[9px]">admin@gymapp.com</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleQuickLogin('owner')}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="w-[48%] py-2.5 px-3 rounded-xl border items-center flex-row"
              >
                <View className="w-2.5 h-2.5 rounded-full bg-primary mr-2" />
                <View>
                  <Text style={{ color: colors.text }} className="text-[11px] font-bold">Rajesh Singhania</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[9px]">owner@fitzone.com</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleQuickLogin('trainer')}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="w-[48%] py-2.5 px-3 rounded-xl border items-center flex-row"
              >
                <View className="w-2.5 h-2.5 rounded-full bg-secondary mr-2" />
                <View>
                  <Text style={{ color: colors.text }} className="text-[11px] font-bold">Vikram Rathore</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[9px]">trainer@fitzone.com</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleQuickLogin('member')}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="w-[48%] py-2.5 px-3 rounded-xl border items-center flex-row"
              >
                <View className="w-2.5 h-2.5 rounded-full bg-gray-500 mr-2" />
                <View>
                  <Text style={{ color: colors.text }} className="text-[11px] font-bold">Arjun Mehta</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[9px]">john@member.com</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
