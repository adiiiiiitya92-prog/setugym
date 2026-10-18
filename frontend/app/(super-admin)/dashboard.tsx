import React, { useState, useContext, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { GymContext } from '../../context/GymContext';
import { StatCard } from '../../components/ui/StatCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { BarChart } from 'react-native-chart-kit';
import { MOCK_MONTHLY_REVENUE } from '../../constants/mockData';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../../utils/dateHelper';
import { useRouter } from 'expo-router';

export default function SuperAdminDashboard() {
  const { colors, isDark } = useTheme();
  const gymContext = useContext(GymContext);
  
  if (!gymContext) return null;
  const { gyms, owners, invoices, feedbacks, planUpgradeRequests, dispatch, refetch } = gymContext;

  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Compute metrics dynamically from the context
  const totalGyms = gyms.length;
  const activeGyms = gyms.filter(g => g.status === 'active').length;
  const trialGyms = gyms.filter(g => g.status === 'trial').length;
  
  const platformRevenue = useMemo(() => {
    // Sum standard platform invoices
    return invoices.reduce((acc, inv) => acc + inv.total, 0);
  }, [invoices]);

  // Feed activities compiled from mock elements
  const activities = useMemo(() => {
    return [] as any[];
  }, []);

  // Filter activities based on search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery) return activities;
    return activities.filter(a => a.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activities, searchQuery]);

  // Chart configuration
  const chartData = {
    labels: MOCK_MONTHLY_REVENUE.map(item => item.month),
    datasets: [
      {
        data: MOCK_MONTHLY_REVENUE.map(item => item.revenue)
      }
    ]
  };

  const screenWidth = Dimensions.get('window').width;

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(108, 71, 255, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#6C47FF"
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C47FF" />
      }
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      {/* Search filtration at the top */}
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search activities or alerts..."
      />

      {/* Hero Welcome banner */}
      <View className="mb-6 mt-1 bg-primary/5 p-5 rounded-3xl border border-primary/10">
        <Text style={{ color: '#6C47FF' }} className="text-xs font-black uppercase tracking-widest">
          ⚡ SYSTEM OVERVIEW
        </Text>
        <Text style={{ color: colors.text }} className="text-3xl font-black tracking-tight mt-1">
          Platform Health
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-xs font-medium mt-1 leading-5">
          Real-time diagnostics, subscription analytics, and platform billing overview.
        </Text>
      </View>

      {/* Grid of cards */}
      <View className="flex-row flex-wrap justify-between gap-4 mb-6">
        <StatCard 
          title="Total Gyms" 
          value={totalGyms} 
          icon="business-outline" 
          color="#6C47FF"
          subtitle={`${activeGyms} Active, ${trialGyms} Trial`}
        />
        <StatCard 
          title="Total Platform Revenue" 
          value={`₹${platformRevenue.toLocaleString('en-IN')}`} 
          icon="wallet-outline" 
          color="#00C896"
          subtitle="All subscription tiers"
        />
      </View>

      {/* Revenue bar chart */}
      <View className="mb-6">
        <Text style={{ color: colors.text }} className="text-lg font-black mb-3">
          Monthly Platform Revenue
        </Text>
        <Card noPadding className="overflow-hidden p-2 items-center">
          <BarChart
            data={chartData}
            width={screenWidth - 48}
            height={200}
            yAxisLabel="₹"
            yAxisSuffix=""
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </Card>
      </View>

      {/* Quick Portals Action */}
      <View className="mb-6">
        <Text style={{ color: colors.text }} className="text-lg font-black mb-3">
          Quick Portals
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(super-admin)/qr-generator' as any)}
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="p-4 border rounded-2xl flex-row justify-between items-center shadow-sm active:scale-98"
        >
          <View className="flex-row items-center flex-1">
            <View 
              style={{ backgroundColor: 'rgba(108, 71, 255, 0.1)' }} 
              className="p-3 rounded-2xl mr-3"
            >
              <Ionicons name="qr-code-outline" size={20} color="#6C47FF" />
            </View>
            <View className="flex-1 pr-2">
              <Text style={{ color: colors.text }} className="text-sm font-bold">Branch QR Codes</Text>
              <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-0.5 font-medium leading-4" numberOfLines={1}>
                Generate reception QR code sheet for any branch
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Feed recent activity */}
      <View className="mb-2">
        <Text style={{ color: colors.text }} className="text-lg font-black mb-3">
          Recent Platform Activity
        </Text>
        
        {filteredActivities.length === 0 ? (
          <Card className="items-center py-8">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No recent activities match your filter.</Text>
          </Card>
        ) : (
          filteredActivities.map((act) => (
            <Card key={act.id} className="mb-3 p-4 flex-row items-center">
              <View 
                style={{ 
                  backgroundColor: 
                    act.type === 'owner' ? 'rgba(108, 71, 255, 0.1)' : 
                    act.type === 'plan' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 107, 53, 0.1)' 
                }} 
                className="p-2.5 rounded-xl mr-3"
              >
                <Ionicons 
                  name={
                    act.type === 'owner' ? "person-outline" : 
                    act.type === 'plan' ? "card-outline" : "business-outline"
                  } 
                  size={16} 
                  color={
                    act.type === 'owner' ? '#6C47FF' : 
                    act.type === 'plan' ? '#10B981' : '#FF6B35'
                  } 
                />
              </View>
              <View className="flex-1 mr-2">
                <Text style={{ color: colors.text }} className="text-xs font-bold leading-5">
                  {act.text}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-1">
                  {formatDate(act.date, "PPpp")}
                </Text>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Pending Plan Upgrade Requests */}
      <View className="mb-2 mt-6">
        <Text style={{ color: colors.text }} className="text-lg font-black mb-3">
          Pending Upgrade Requests
        </Text>
        
        {!planUpgradeRequests || planUpgradeRequests.filter(r => r.status === 'pending').length === 0 ? (
          <Card className="items-center py-8">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No pending upgrade requests.</Text>
          </Card>
        ) : (
          planUpgradeRequests.filter(r => r.status === 'pending').map((req) => (
            <Card key={req.id} className="mb-3.5 p-4 border border-border/40 relative overflow-hidden bg-card shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-2xl bg-amber-500/10 items-center justify-center mr-3">
                    <Ionicons name="swap-horizontal-outline" size={18} color="#D97706" />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="text-sm font-black" numberOfLines={1}>{req.ownerName}</Text>
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold" numberOfLines={1}>{req.gymName}</Text>
                  </View>
                </View>
                <View className="bg-amber-500/10 px-2.5 py-1 rounded-full">
                  <Text className="text-amber-600 text-[9px] font-extrabold uppercase tracking-wide">Pending</Text>
                </View>
              </View>
              
              <View className="bg-gray-50 dark:bg-gray-800/20 p-3 rounded-2xl mb-4 flex-row justify-between items-center">
                <View>
                  <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Requested Tier Upgrade</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-black mt-0.5">{req.requestedPlanName}</Text>
                </View>
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-semibold">{formatDate(req.requestDate)}</Text>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    dispatch({ type: 'APPROVE_PLAN_UPGRADE_REQUEST', payload: req.id });
                  }}
                  className="flex-1 bg-emerald-500 py-3 rounded-xl items-center justify-center active:scale-95 shadow-sm shadow-emerald-500/20"
                >
                  <Text className="text-white text-xs font-black uppercase tracking-wider">Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => dispatch({ type: 'REJECT_PLAN_UPGRADE_REQUEST', payload: req.id })}
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                  className="flex-1 border py-3 rounded-xl items-center justify-center active:scale-95"
                >
                  <Text style={{ color: colors.text }} className="text-xs font-black uppercase tracking-wider">Reject</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Gym Owner Feedbacks Feed */}
      <View className="mb-2 mt-6">
        <Text style={{ color: colors.text }} className="text-lg font-black mb-3">
          Gym Owner Feedbacks
        </Text>
        
        {!feedbacks || feedbacks.length === 0 ? (
          <Card className="items-center py-8">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No feedback submitted yet.</Text>
          </Card>
        ) : (
          feedbacks.map((feed) => (
            <Card key={feed.id} className="mb-4 p-4 relative overflow-hidden bg-card border border-border/40 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <View style={{ backgroundColor: 'rgba(108, 71, 255, 0.1)' }} className="w-10 h-10 rounded-2xl items-center justify-center mr-3">
                    <Text style={{ color: '#6C47FF' }} className="text-sm font-black">
                      {feed.ownerName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.text }} className="text-xs font-black" numberOfLines={1}>
                      {feed.ownerName}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold" numberOfLines={1}>
                      {feed.gymName}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-0.5 bg-yellow-500/5 px-2 py-1 rounded-full items-center">
                  <Ionicons name="star" size={11} color="#FFD700" className="mr-1" />
                  <Text className="text-yellow-600 dark:text-yellow-500 text-[10px] font-black">{feed.rating.toFixed(1)}</Text>
                </View>
              </View>
              
              <View className="bg-gray-50 dark:bg-gray-800/10 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/30 mb-2">
                <Text style={{ color: colors.text }} className="text-xs font-medium italic leading-5">
                  "{feed.comment}"
                </Text>
              </View>
              
              <View className="flex-row justify-between items-center mt-1">
                <View className="flex-row gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= feed.rating ? "star" : "star-outline"}
                      size={10}
                      color="#FFD700"
                    />
                  ))}
                </View>
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-semibold">
                  {formatDate(feed.date)}
                </Text>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}
