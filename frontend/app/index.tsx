import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ONBOARDING_KEY = "@setugym_onboarding_done";

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeSlide, setActiveSlide] = useState(0);
  const [loadingCheck, setLoadingCheck] = useState(true);

  // Check onboarding status on launch
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (value === 'true') {
          // Skip onboarding, go directly to auth routing
          redirectToApp();
        } else {
          setLoadingCheck(false);
        }
      } catch (e) {
        setLoadingCheck(false);
      }
    };
    checkStatus();
  }, [isAuthenticated]);

  const redirectToApp = () => {
    if (isAuthenticated) {
      router.replace('/(super-admin)/dashboard'); // Auth guards will route to proper portal automatically
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleFinishOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      redirectToApp();
    } catch (e) {
      redirectToApp();
    }
  };

  const slides = [
    {
      id: 0,
      emoji: "🏋️‍♂️",
      title: "Elevate Your Gym Experience",
      desc: "Complete digital ecosystem connecting platform operators, fitness trainers, and athletes in one unified network."
    },
    {
      id: 1,
      emoji: "⚡",
      title: "Smart QR Attendance Tracker",
      desc: "Log daily membership entries instantly. Show your personal secure access card QR or check in via receptionist kiosks."
    },
    {
      id: 2,
      emoji: "📈",
      title: "Goal Nutrition & Workout splits",
      desc: "Receive tailored meals, track daily macro metrics, and log biometric stats."
    }
  ];

  const handleNext = () => {
    if (activeSlide < slides.length - 1) {
      setActiveSlide(activeSlide + 1);
    } else {
      handleFinishOnboarding();
    }
  };

  if (loadingCheck) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }} className="text-sm font-semibold">Loading Walkthrough...</Text>
      </View>
    );
  }

  const currentSlide = slides[activeSlide];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }} className="p-6 justify-between">
      {/* Skip button */}
      <View className="flex-row justify-end mt-2">
        <TouchableOpacity onPress={handleFinishOnboarding} className="px-4 py-2">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-black uppercase tracking-wider">
            Skip Intro
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slide body visual representation */}
      <View className="items-center px-4 my-auto">
        <Text className="text-[96px] mb-8">{currentSlide.emoji}</Text>
        <Text style={{ color: colors.text }} className="text-2xl font-black text-center mb-3.5 tracking-tight">
          {currentSlide.title}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm font-semibold text-center leading-6 max-w-[280px]">
          {currentSlide.desc}
        </Text>
      </View>

      {/* Footer controls indicators */}
      <View className="mb-8">
        {/* Bullets dots indicator */}
        <View className="flex-row justify-center gap-2 mb-6">
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: activeSlide === idx ? '#6C47FF' : colors.border,
                width: activeSlide === idx ? 20 : 8,
                height: 8,
                borderRadius: 4
              }}
            />
          ))}
        </View>

        <Button
          title={activeSlide === slides.length - 1 ? "Get Started" : "Continue"}
          onPress={handleNext}
          className="rounded-xl w-full"
        />
      </View>
    </View>
  );
}
