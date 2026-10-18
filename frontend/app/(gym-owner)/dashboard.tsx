import React, { useState, useContext, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PlanCard } from '../../components/PlanCard';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/dateHelper';
import { Ionicons } from '@expo/vector-icons';
import { subDays, isBefore, addDays, parseISO } from 'date-fns';
import { formatCurrency } from '../../utils/currencyHelper';

export default function GymOwnerDashboard() {
  const { colors } = useTheme();
  const { user, switchGymBranch } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const gymContext = useContext(GymContext);
  if (!gymContext) return null;
  const { gyms, owners, members, attendanceRecords, invoices, subscriptionPlans, dispatch } = gymContext;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Multi-gym support - Active gym state from AuthContext session
  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const [gymSelectorVisible, setGymSelectorVisible] = useState(false);

  // Paywall selector state
  const [paywallVisible, setPaywallVisible] = useState(false);

  const activeGym = useMemo(() => gyms.find(g => g.id === activeGymId), [gyms, activeGymId]);
  const currentOwner = useMemo(() => owners.find(o => o.id === user?.id), [owners, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  // Compute metrics for the active gym
  const gymMembers = useMemo(() => members.filter(m => m.gymId === activeGymId), [members, activeGymId]);
  
  const activeToday = useMemo(() => {
    const todayStr = formatDate(new Date(), "yyyy-MM-dd");
    return attendanceRecords.filter(r => r.gymId === activeGymId && r.date === todayStr).length;
  }, [attendanceRecords, activeGymId]);

  const monthlyRevenueByCurrency = useMemo(() => {
    const currentMonth = formatDate(new Date(), "yyyy-MM");
    const filtered = invoices.filter(i => i.gymId === activeGymId && i.status === 'paid' && i.date.startsWith(currentMonth));
    const aggregates: Record<string, number> = {};
    filtered.forEach(inv => {
      const c = inv.currency || 'USD';
      let invoicePaidSum = 0;
      if (inv.hasInstallments) {
        if (inv.firstInstallmentStatus === 'paid') invoicePaidSum += inv.firstInstallmentAmount || 0;
        if (inv.secondInstallmentStatus === 'paid') invoicePaidSum += inv.secondInstallmentAmount || 0;
      } else {
        invoicePaidSum = inv.total;
      }
      aggregates[c] = (aggregates[c] || 0) + invoicePaidSum;
    });
    return aggregates;
  }, [invoices, activeGymId]);

  const monthlyRevenueFormatted = useMemo(() => {
    const keys = Object.keys(monthlyRevenueByCurrency);
    if (keys.length === 0) return "₹0.00";
    return keys.map(k => formatCurrency(monthlyRevenueByCurrency[k], k)).join(' + ');
  }, [monthlyRevenueByCurrency]);

  const expiringSoon = useMemo(() => {
    const today = new Date();
    const next7Days = addDays(today, 7);
    return gymMembers.filter(m => {
      if (m.status !== 'active') return false;
      const end = parseISO(m.endDate);
      return isBefore(end, next7Days) && isBefore(today, end);
    }).length;
  }, [gymMembers]);

  // Trial duration checks
  const trialDaysLeft = currentOwner ? currentOwner.trialDaysRemaining : 0;
  const isTrial = currentOwner?.status === 'trial';
  const isExpired = currentOwner?.status === 'expired';

  const handleSwitchGym = async (gymId: string) => {
    await switchGymBranch(gymId);
    setGymSelectorVisible(false);
    toast.success(`Switched to branch: ${gyms.find(g => g.id === gymId)?.name}`);
  };

  React.useEffect(() => {
    if (isTrial && trialDaysLeft > 0 && trialDaysLeft <= 3) {
      toast.error(`Reminder: You have ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your free trial! Please upgrade to avoid losing access.`);
    }
  }, [isTrial, trialDaysLeft]);

  const handleChoosePlan = (planId: string) => {
    if (user?.id) {
      dispatch({
        type: 'UPDATE_OWNER_PLAN',
        payload: { ownerId: user.id, planId }
      });
      toast.success("Successfully upgraded to standard subscription tier!");
      setPaywallVisible(false);
    }
  };

  // Block access to features if trial has fully expired
  const handleFeatureClick = (route: string) => {
    if (isExpired) {
      setPaywallVisible(true);
      toast.error("Your free trial has expired. Upgrade your plan to access features.");
      return;
    }
    router.push(route as any);
  };

  const shortcuts = [
    { id: 'sc-1', title: "Check-in Logs", icon: "calendar", color: "#6C47FF", route: "/(gym-owner)/attendance", featureKey: "attendance" },
    { id: 'sc-2', title: "Member Plans", icon: "pricetags", color: "#00C896", route: "/(gym-owner)/membership-plans", featureKey: "membership-plans" },
    { id: 'sc-3', title: "Announcements", icon: "megaphone", color: "#FF6B35", route: "/(gym-owner)/notices", featureKey: "notices" },
    { id: 'sc-5', title: "Reception QR", icon: "qr-code", color: "#EC4899", route: "/(gym-owner)/qr-generator", featureKey: "qr-generator" },
    { id: 'sc-6', title: "Enquiries/Visitors", icon: "mail-unread", color: "#3B82F6", route: "/(gym-owner)/enquiries", featureKey: "enquiries" },
    { id: 'sc-7', title: "Diet Plans", icon: "restaurant", color: "#EAB308", route: "/(gym-owner)/diet-plans", featureKey: "diet-plans" },
    { id: 'sc-8', title: "Workout Plans", icon: "barbell", color: "#8B5CF6", route: "/(gym-owner)/workout-plans", featureKey: "workout-plans" },
    { id: 'sc-9', title: "Expenses Tracker", icon: "calculator", color: "#EF4444", route: "/(gym-owner)/expenses", featureKey: "expenses" },
    { id: 'sc-10', title: "Biometric Portal", icon: "finger-print", color: "#6D28D9", route: "/(gym-owner)/biometric-attendance", featureKey: "biometric-attendance" },
  ];

  const filteredShortcuts = useMemo(() => {
    const disabled = activeGym?.disabledFeatures || [];
    const visible = shortcuts.filter(s => !disabled.includes(s.featureKey));
    if (!searchQuery) return visible;
    return visible.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, activeGym]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C47FF" />
      }
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      {/* Top Search filtration */}
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search shortcuts or settings..."
      />

      {/* Multi-Gym branch switcher banner */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-1 mr-2">
          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-widest">
            GYM MANAGER
          </Text>
          <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight" numberOfLines={1}>
            {activeGym?.name || "Active Gym"}
          </Text>
        </View>
        
        {currentOwner?.gymIds && currentOwner.gymIds.length > 1 && (
          <TouchableOpacity
            onPress={() => setGymSelectorVisible(true)}
            style={{ backgroundColor: 'rgba(108, 71, 255, 0.1)' }}
            className="flex-row items-center px-4 py-2 rounded-xl active:opacity-90"
          >
            <Ionicons name="swap-horizontal" size={16} color="#6C47FF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#6C47FF' }} className="font-bold text-xs">Switch Branch</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Free Trial Banner alerting owner */}
      {isTrial && trialDaysLeft <= 3 && (
        <Card 
          style={{ backgroundColor: 'rgba(255, 107, 53, 0.08)', borderColor: 'rgba(255, 107, 53, 0.2)', borderWidth: 1.5 }}
          className="mb-6 p-4 flex-row items-center"
        >
          <View className="p-2 bg-accent/20 rounded-xl mr-3">
            <Ionicons name="warning" size={20} color="#FF6B35" />
          </View>
          <View className="flex-1 mr-2">
            <Text style={{ color: colors.text }} className="text-xs font-black">
              Trial Expiring Soon!
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-0.5 font-semibold">
              Only {trialDaysLeft} days remaining in your free trial. Choose a platform tier to avoid gaps.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPaywallVisible(true)}
            className="bg-accent px-3 py-1.5 rounded-lg active:scale-95 shadow-sm"
          >
            <Text className="text-white font-bold text-[10px]">UPGRADE</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Blocked access paywall alert banner */}
      {isExpired && (
        <Card 
          style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)', borderColor: '#FF6B35', borderWidth: 2 }}
          className="mb-6 p-4 flex-row items-center"
        >
          <View className="p-2.5 bg-accent/20 rounded-full mr-3">
            <Ionicons name="lock-closed" size={22} color="#FF6B35" />
          </View>
          <View className="flex-1 mr-2">
            <Text style={{ color: colors.text }} className="text-xs font-black">
              Free Trial Has Concluded
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-0.5 font-semibold">
              Your trial period has expired. Please select a platform plan below to reactivate core panels.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPaywallVisible(true)}
            className="bg-accent px-3 py-2 rounded-xl active:scale-95 shadow-sm"
          >
            <Text className="text-white font-black text-xs">PAYWALL</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Grid of metrics */}
      <View className="flex-row flex-wrap justify-between gap-4 mb-6">
        <StatCard 
          title="Total Members" 
          value={gymMembers.length} 
          icon="people" 
          color="#6C47FF"
          subtitle="All active, unpaid, expired"
        />
        <StatCard 
          title="Present Today" 
          value={activeToday} 
          icon="checkmark-done-circle" 
          color="#00C896"
          subtitle="Registered daily check-ins"
        />
        <StatCard 
          title="This Month Cash" 
          value={monthlyRevenueFormatted} 
          icon="wallet" 
          color="#10B981"
          subtitle="Collected payments total"
        />
        <StatCard 
          title="Expiring (7d)" 
          value={expiringSoon} 
          icon="hourglass" 
          color="#FF6B35"
          subtitle="Nearing membership ends"
        />
      </View>

      {/* Shortcuts grid */}
      <View className="mb-2">
        <Text style={{ color: colors.text }} className="text-lg font-black mb-3">
          Quick Portals
        </Text>
        
        {filteredShortcuts.length === 0 ? (
          <Card className="items-center py-6">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No shortcuts match search.</Text>
          </Card>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {filteredShortcuts.map((sc) => (
              <TouchableOpacity
                key={sc.id}
                onPress={() => handleFeatureClick(sc.route)}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="w-[47%] p-5 rounded-2xl border items-center shadow-sm active:scale-98"
              >
                <View 
                  style={{ backgroundColor: `${sc.color}15` }} 
                  className="p-3 rounded-full mb-3"
                >
                  <Ionicons name={sc.icon as any} size={22} color={sc.color} />
                </View>
                <Text style={{ color: colors.text }} className="text-xs font-bold text-center">
                  {sc.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>



      {/* SWITCH ACTIVE BRANCH MULTI-GYM SELECTOR */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={gymSelectorVisible}
        onRequestClose={() => setGymSelectorVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
            <Text style={{ color: colors.text }} className="text-lg font-black mb-4 text-center">Switch Active Branch</Text>
            
            {currentOwner?.gymIds?.map((gymId) => {
              const gym = gyms.find(g => g.id === gymId);
              if (!gym) return null;
              const isCurrent = gym.id === activeGymId;
              
              return (
                <TouchableOpacity
                  key={gymId}
                  onPress={() => handleSwitchGym(gymId)}
                  style={{ borderColor: isCurrent ? '#6C47FF' : colors.border }}
                  className="flex-row items-center justify-between p-3.5 border rounded-xl mb-2.5 active:opacity-90"
                >
                  <Text style={{ color: colors.text }} className="text-xs font-bold">{gym.name}</Text>
                  {isCurrent && <Ionicons name="checkmark-circle" size={16} color="#6C47FF" />}
                </TouchableOpacity>
              );
            })}
            
            <Button title="Close Options" variant="outline" onPress={() => setGymSelectorVisible(false)} className="mt-2 rounded-xl" />
          </View>
        </View>
      </Modal>

      {/* PLATFORM SUBSCRIPTION PAYWALL MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paywallVisible}
        onRequestClose={() => setPaywallVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ color: colors.text }} className="text-lg font-black">
                SetuGym Platform Tiers
              </Text>
              <TouchableOpacity onPress={() => setPaywallVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary }} className="text-xs mb-5 font-semibold leading-4">
              Select one of our scalable pricing packages to activate all dashboard properties and manage your gym operations.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {subscriptionPlans.filter(p => p.isActive).map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  onSelect={() => handleChoosePlan(p.id)}
                  selected={currentOwner?.planId === p.id}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
