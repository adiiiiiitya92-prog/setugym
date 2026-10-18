import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { PlanCard } from '../../components/PlanCard';
import { useGym } from '../../context/GymContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GymOwnerLayout() {
  const { colors } = useTheme();
  const { logout, user, stopImpersonating } = useAuth();
  const router = useRouter();
  const { notifications, gyms, owners, subscriptionPlans, planUpgradeRequests, dispatch } = useGym();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const activeGym = gyms.find(g => g.id === activeGymId);
  const activeGymDisabledFeatures = activeGym?.disabledFeatures || [];

  const currentOwner = owners.find(o => o.id === user?.id);
  const isTrial = currentOwner?.status === 'trial';
  const trialDaysLeft = currentOwner ? currentOwner.trialDaysRemaining : 0;
  const isExpired = currentOwner?.status === 'expired' || (isTrial && trialDaysLeft <= 0);
  const pendingRequest = planUpgradeRequests?.find(r => r.ownerId === user?.id && r.status === 'pending');

  const unreadCount = notifications.filter(
    n => (n.audience === 'everyone' || n.audience === 'admins') && !n.read
  ).length;

  const handleChoosePlan = (planId: string) => {
    if (user?.id) {
      if (pendingRequest) {
        toast.error("You already have a pending upgrade request.");
        return;
      }
      const plan = subscriptionPlans.find(p => p.id === planId);
      dispatch({
        type: 'CREATE_PLAN_UPGRADE_REQUEST',
        payload: {
          id: `req-${Date.now()}`,
          ownerId: user.id,
          ownerName: currentOwner?.name || "Unknown Owner",
          gymName: activeGym?.name || "Unknown Gym",
          currentPlanId: currentOwner?.planId,
          requestedPlanId: planId,
          requestedPlanName: plan?.name || "Unknown Plan",
          status: 'pending',
          requestDate: new Date().toISOString()
        }
      });
      toast.success(`Upgrade request to ${plan?.name || "selected tier"} submitted!`);
    }
  };

  if (isExpired) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
        <View className="p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <Text style={{ color: '#FF6B35' }} className="text-3xl font-black mb-2">Free Trial Ended</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm leading-5 font-medium">
            {pendingRequest 
              ? "Your plan upgrade request is pending Super Admin approval. You will regain access to your dashboard once approved."
              : "Your trial period has concluded. To continue using the platform and managing your gym, please select a subscription plan."}
          </Text>
        </View>
        {!pendingRequest && (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {subscriptionPlans.filter(p => p.isActive).map(p => (
              <PlanCard 
                key={p.id}
                plan={p}
                onSelect={() => handleChoosePlan(p.id)}
              />
            ))}
          </ScrollView>
        )}
        <View className="p-6 mt-auto">
           <TouchableOpacity onPress={logout} className="p-4 bg-gray-200 dark:bg-gray-800 rounded-xl items-center active:scale-95">
             <Text style={{ color: colors.text }} className="font-bold text-sm uppercase">Log Out</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {user?.originalUser && (
        <View 
          style={{ backgroundColor: '#FF6B35', paddingTop: insets.top + 8 }} 
          className="pb-2.5 px-4 flex-row justify-between items-center shadow-md"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons name="eye-outline" size={16} color="#FFFFFF" className="mr-2" />
            <Text className="text-white text-xs font-black" numberOfLines={1}>
              Impersonating: {user.name} ({activeGym?.name || "Active Gym"})
            </Text>
          </View>
          <TouchableOpacity 
            onPress={async () => {
              await stopImpersonating();
              router.replace('/(super-admin)/dashboard');
            }}
            className="bg-white px-3 py-1.5 rounded-lg active:scale-95 shadow-sm"
          >
            <Text className="text-accent font-black text-[10px] uppercase">Exit Portal</Text>
          </TouchableOpacity>
        </View>
      )}
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
          title: "Owner Portal",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
          headerRight: () => (
            <View className="flex-row items-center mr-4 gap-2">
              <TouchableOpacity 
                onPress={() => router.push('/(gym-owner)/notifications')} 
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
        name="members"
        options={{
          title: "Gym Members",
          tabBarLabel: "Members",
          href: activeGymDisabledFeatures.includes('members') ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: "Trainer Directory",
          tabBarLabel: "Trainers",
          href: activeGymDisabledFeatures.includes('staff') ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="financial"
        options={{
          title: "Reports Portal",
          tabBarLabel: "Reports",
          href: activeGymDisabledFeatures.includes('financial') ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "document-text" : "document-text-outline"} size={24} color={color} />
          ),
        }}
      />
      
      {/* Hide secondary screens from bottom menu but keep router compilation paths */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: "Daily Attendance",
          href: null,
        }}
      />
      <Tabs.Screen
        name="qr-generator"
        options={{
          title: "Reception QR Code",
          href: null,
        }}
      />
      <Tabs.Screen
        name="membership-plans"
        options={{
          title: "Manage Member Plans",
          href: null,
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          title: "Broadcast Announcements",
          href: null,
        }}
      />
      <Tabs.Screen
        name="enquiries"
        options={{
          title: "Visitor Enquiries",
          href: null,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses Tracker",
          href: null,
        }}
      />
      <Tabs.Screen
        name="diet-plans"
        options={{
          title: "Diet Plans",
          href: null,
        }}
      />
      <Tabs.Screen
        name="workout-plans"
        options={{
          title: "Workout Plans",
          href: null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Gym Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
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
      <Tabs.Screen
        name="add-staff-member"
        options={{
          title: "Add Staff Member",
          href: null,
        }}
      />
      <Tabs.Screen
        name="biometric-attendance"
        options={{
          title: "Biometric Attendance",
          href: null,
        }}
      />
    </Tabs>
    </View>
  );
}
