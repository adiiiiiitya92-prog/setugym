import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SuperAdminLayout() {
  const { colors, theme } = useTheme();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

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
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
          headerRight: () => (
            <TouchableOpacity onPress={logout} className="mr-4 p-2 bg-accent/10 rounded-full">
              <Ionicons name="log-out-outline" size={18} color="#FF6B35" />
            </TouchableOpacity>
          )
        }}
      />
      <Tabs.Screen
        name="gym-owners"
        options={{
          title: "Gym Owners",
          tabBarLabel: "Owners",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Subscription Plans",
          tabBarLabel: "Plans",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "card" : "card-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Platform Insights",
          tabBarLabel: "Insights",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "analytics" : "analytics-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Platform Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr-generator"
        options={{
          title: "Branch QR Generator",
          href: null,
        }}
      />
      <Tabs.Screen
        name="add-gym-owner"
        options={{
          title: "Add Gym Owner",
          href: null,
        }}
      />
    </Tabs>
  );
}
