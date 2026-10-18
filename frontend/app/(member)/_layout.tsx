import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useGym } from '../../context/GymContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MemberLayout() {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const { notifications } = useGym();
  const insets = useSafeAreaInsets();

  const unreadCount = notifications.filter(
    n => (n.audience === 'everyone' || n.audience === 'members') && !n.read
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '900',
          fontSize: 18,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#6C47FF',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "My Fitness Profile",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
          headerRight: () => (
            <View className="flex-row items-center mr-4 gap-2">
              <TouchableOpacity 
                onPress={() => router.push('/(member)/notifications')} 
                className="p-2 bg-primary/10 rounded-full relative"
              >
                <Ionicons name="notifications-outline" size={18} color="#6C47FF" />
                {unreadCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-accent w-4.5 h-4.5 rounded-full items-center justify-center border-2 border-white dark:border-gray-900">
                    <Text className="text-white text-[8px] font-black">{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={logout} className="p-2 bg-accent/10 rounded-full">
                <Ionicons name="log-out-outline" size={18} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          )
        }}
      />
      <Tabs.Screen
        name="my-qr"
        options={{
          title: "My Check-In QR",
          href: null,
        }}
      />
      <Tabs.Screen
        name="diet-plan"
        options={{
          title: "My Nutrition Plan",
          tabBarLabel: "Nutrition",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "restaurant" : "restaurant-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout-plan"
        options={{
          title: "My Workout Program",
          tabBarLabel: "Workouts",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-coach"
        options={{
          title: "AI Workout Coach",
          tabBarLabel: "AI Coach",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={22} color={color} />
          ),
        }}
      />
      
      {/* Hide secondary calendars/payments screens from bottom navigation bar */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance Tracker",
          href: null,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Invoice Receipts",
          href: null,
        }}
      />
      <Tabs.Screen
        name="scan-attendance"
        options={{
          title: "Check In/Out Attendance",
          tabBarLabel: "Check In/Out",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "scan-circle" : "scan-circle-outline"} size={26} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "My Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notification Center",
          href: null,
        }}
      />
    </Tabs>
  );
}
