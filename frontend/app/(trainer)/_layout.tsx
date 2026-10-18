import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useGym } from '../../context/GymContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TrainerLayout() {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();
  const { notifications } = useGym();
  const insets = useSafeAreaInsets();

  const unreadCount = notifications.filter(
    n => (n.audience === 'everyone' || n.audience === 'trainers') && !n.read
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
          title: "Trainer Console",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
          headerRight: () => (
            <View className="flex-row items-center mr-4 gap-2">
              <TouchableOpacity 
                onPress={() => router.push('/(trainer)/notifications')} 
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
        name="my-members"
        options={{
          title: "My Clients",
          tabBarLabel: "Clients",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diet-plans"
        options={{
          title: "Diet Plans",
          tabBarLabel: "Diets",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "restaurant" : "restaurant-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout-plans"
        options={{
          title: "Workout Plans",
          tabBarLabel: "Workouts",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-assistant"
        options={{
          title: "AI Workout Assistant",
          tabBarLabel: "AI Coach",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr-scanner"
        options={{
          title: "QR Check-In",
          href: null,
        }}
      />
      <Tabs.Screen
        name="scan-attendance"
        options={{
          title: "Check In/Out Attendance",
          href: null,
        }}
      />
      <Tabs.Screen
        name="attendance-log"
        options={{
          title: "Attendance Log",
          tabBarLabel: "Logs",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
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
