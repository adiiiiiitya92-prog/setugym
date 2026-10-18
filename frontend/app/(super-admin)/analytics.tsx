import React, { useState, useContext, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { format, subMonths } from 'date-fns';

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { gyms, members, owners, invoices, refetch } = gymContext;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  // Compile top gyms by member counts
  const topGyms = useMemo(() => {
    return gyms.map(gym => {
      const count = members.filter(m => m.gymId === gym.id).length;
      return {
        id: gym.id,
        name: gym.name,
        count
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  }, [gyms, members]);

  // Filter top gyms by search query
  const filteredTopGyms = useMemo(() => {
    if (!searchQuery) return topGyms;
    return topGyms.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [topGyms, searchQuery]);

  const screenWidth = Dimensions.get('window').width;

  // Dynamic stats calculation
  const totalOwners = owners.length;
  const activeOwners = owners.filter(o => o.status === 'active').length;
  const trialConversionRate = totalOwners > 0 ? (activeOwners / totalOwners) * 100 : 0;

  const totalSubscribedOwners = owners.filter(o => o.status !== 'trial').length;
  const inactiveOrSuspendedOwners = owners.filter(o => o.status === 'expired' || o.status === 'suspended').length;
  const churnRate = totalSubscribedOwners > 0 ? (inactiveOrSuspendedOwners / totalSubscribedOwners) * 100 : 0;

  const last6Months = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      months.push(subMonths(new Date(), i));
    }
    return months;
  }, []);

  const ownerInvoices = useMemo(() => {
    return invoices.filter(inv => owners.some(o => o.id === inv.memberId));
  }, [invoices, owners]);

  const chartData = useMemo(() => {
    const labels = last6Months.map(date => format(date, "MMM"));
    const data = last6Months.map(monthDate => {
      const monthStr = format(monthDate, "yyyy-MM");
      const monthInvoices = ownerInvoices.filter(inv => inv.date.startsWith(monthStr));
      const totalPaid = monthInvoices.reduce((sum, inv) => {
        let paid = 0;
        if (inv.hasInstallments) {
          if (inv.firstInstallmentStatus === 'paid') paid += inv.firstInstallmentAmount || 0;
          if (inv.secondInstallmentStatus === 'paid') paid += inv.secondInstallmentAmount || 0;
        } else {
          if (inv.status === 'paid') paid += inv.total;
        }
        return sum + paid;
      }, 0);
      return totalPaid;
    });

    return {
      labels,
      datasets: [{ data }]
    };
  }, [last6Months, ownerInvoices]);

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 200, 150, ${opacity})`, // teal colors for analytics
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#00C896"
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
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search gyms or insights..."
      />

      <View className="mb-6 mt-1">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
          SYSTEM HEALTH
        </Text>
        <Text style={{ color: colors.text }} className="text-3xl font-black tracking-tight mt-1">
          Platform Performance
        </Text>
      </View>

      {/* Grid of indicators */}
      <View className="flex-row flex-wrap justify-between gap-4 mb-6">
        <StatCard 
          title="Trial Conversion Rate" 
          value={`${trialConversionRate.toFixed(1)}%`} 
          icon="trending-up" 
          color="#00C896"
          subtitle="Trial to Standard upgrade"
        />
        <StatCard 
          title="Churn Rate" 
          value={`${churnRate.toFixed(1)}%`} 
          icon="trending-down" 
          color="#FF6B35"
          subtitle="Subscribers cancelled (mo)"
        />
      </View>

      {/* Chart */}
      <View className="mb-6">
        <Text style={{ color: colors.text }} className="text-lg font-black mb-3">
          Half-Year Platform Growth
        </Text>
        <Card noPadding className="overflow-hidden p-2 items-center">
          <LineChart
            data={chartData}
            width={screenWidth - 48}
            height={200}
            chartConfig={chartConfig}
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </Card>
      </View>

      {/* Leaderboard grid */}
      <View>
        <Text style={{ color: colors.text }} className="text-lg font-black mb-3">
          Top Gym Branches (By Members)
        </Text>

        {filteredTopGyms.length === 0 ? (
          <Card className="items-center py-6">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No results match filters.</Text>
          </Card>
        ) : (
          filteredTopGyms.map((item, idx) => (
            <Card key={item.id} className="mb-3 p-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View 
                  style={{ backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32' }} 
                  className="w-7 h-7 rounded-full items-center justify-center mr-3"
                >
                  <Text className="text-white font-extrabold text-xs">{idx + 1}</Text>
                </View>
                <Text style={{ color: colors.text }} className="text-sm font-bold">
                  {item.name}
                </Text>
              </View>
              <View className="bg-primary/10 px-3 py-1 rounded-xl">
                <Text style={{ color: '#6C47FF' }} className="text-xs font-black">
                  {item.count} Members
                </Text>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}
