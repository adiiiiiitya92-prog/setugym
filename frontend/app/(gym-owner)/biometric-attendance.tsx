import React, { useState, useContext, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import { subDays, format } from 'date-fns';

export default function BiometricAttendanceScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { gyms } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const activeGym = gyms.find(g => g.id === activeGymId);

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState([
    { id: 'bio-1', name: 'John Doe', time: '09:15 AM', date: format(new Date(), "yyyy-MM-dd"), direction: 'IN', deviceId: 'ZKTeco-01' },
    { id: 'bio-2', name: 'Jane Smith', time: '10:30 AM', date: format(new Date(), "yyyy-MM-dd"), direction: 'OUT', deviceId: 'ZKTeco-02' },
    { id: 'bio-3', name: 'Robert Johnson', time: '11:02 AM', date: format(new Date(), "yyyy-MM-dd"), direction: 'IN', deviceId: 'ZKTeco-01' },
    { id: 'bio-4', name: 'Alice Brown', time: '08:45 AM', date: format(subDays(new Date(), 1), "yyyy-MM-dd"), direction: 'IN', deviceId: 'ZKTeco-01' },
    { id: 'bio-5', name: 'David Wilson', time: '05:30 PM', date: format(subDays(new Date(), 1), "yyyy-MM-dd"), direction: 'OUT', deviceId: 'ZKTeco-02' },
    { id: 'bio-6', name: 'Chris Evans', time: '09:00 AM', date: format(subDays(new Date(), 2), "yyyy-MM-dd"), direction: 'IN', deviceId: 'ZKTeco-01' },
    { id: 'bio-7', name: 'Emma Watson', time: '07:15 AM', date: format(subDays(new Date(), 3), "yyyy-MM-dd"), direction: 'IN', deviceId: 'ZKTeco-02' },
  ]);

  // Quick Date Selectors
  const quickDates = useMemo(() => {
    return [
      { label: "Today", dateStr: format(new Date(), "yyyy-MM-dd") },
      { label: "Yesterday", dateStr: format(subDays(new Date(), 1), "yyyy-MM-dd") },
      { label: "2d Ago", dateStr: format(subDays(new Date(), 2), "yyyy-MM-dd") },
      { label: "3d Ago", dateStr: format(subDays(new Date(), 3), "yyyy-MM-dd") },
    ];
  }, []);

  // Filter logs by date & search query
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesDate = log.date === selectedDate;
      const matchesSearch = log.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            log.deviceId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [logs, selectedDate, searchQuery]);

  // Sync Log simulation handler
  const handleSyncLogs = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const names = ['Michael Jordan', 'Serena Williams', 'Tom Brady', 'Roger Federer', 'Lionel Messi'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomDirection = Math.random() > 0.5 ? 'IN' : 'OUT';
      const randomDevice = Math.random() > 0.5 ? 'ZKTeco-01' : 'ZKTeco-02';

      const newRecord = {
        id: `bio-${Date.now()}`,
        name: randomName,
        time: currentTime,
        date: selectedDate, // Sync into currently selected view day
        direction: randomDirection,
        deviceId: randomDevice
      };

      setLogs(prev => [newRecord, ...prev]);
      toast.success(`Sync Complete: 1 new log synced for ${format(new Date(selectedDate), "MMM dd, yyyy")}`);
    }, 1500);
  };

  return (
    <ScrollView 
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      {/* Header Banner */}
      <View className="mb-5 flex-row items-center justify-between">
        <View>
          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-widest">
            {activeGym?.name || "Fitness Center"}
          </Text>
          <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight mt-0.5">
            Biometric Sync Panel
          </Text>
        </View>
        <View className="p-2.5 rounded-full bg-primary/10">
          <Ionicons name="finger-print" size={24} color="#6C47FF" />
        </View>
      </View>

      {/* Network Instruction Banner */}
      <Card className="p-4 mb-5 border border-yellow-500/20 bg-yellow-500/5">
        <View className="flex-row items-start">
          <Ionicons name="wifi-outline" size={20} color="#EAB308" className="mr-3 mt-0.5" />
          <View className="flex-1">
            <Text style={{ color: colors.text }} className="text-xs font-black">Same-Network Connectivity Required</Text>
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-medium leading-4 mt-1">
              Ensure this mobile device is connected to the exact Wi-Fi/LAN subnet as your physical biometric logs terminal (e.g. ZKTeco machine) for correct local synchronization.
            </Text>
          </View>
        </View>
      </Card>

      {/* Action panel & Sync Button */}
      <Card className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text style={{ color: colors.text }} className="text-sm font-extrabold">Device Connection</Text>
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-0.5">
              Protocol: <Text className="text-emerald-500 font-extrabold">ZKTeco Push SDK (LAN)</Text>
            </Text>
          </View>
          <Badge status="active" style={{ alignSelf: 'center' }} />
        </View>

        <Button
          title={syncing ? "Fetching logs from terminal..." : "Sync Attendance Log"}
          onPress={handleSyncLogs}
          disabled={syncing}
          loading={syncing}
          className="rounded-xl w-full"
        />
      </Card>

      {/* Date Quick Tabs */}
      <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-2">
        Filter By Calendar Date
      </Text>
      <View className="flex-row justify-between mb-5 gap-2">
        {quickDates.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => setSelectedDate(item.dateStr)}
              style={{
                backgroundColor: isSelected ? '#6C47FF' : colors.card,
                borderColor: isSelected ? '#6C47FF' : colors.border
              }}
              className="flex-1 py-2.5 rounded-xl border items-center active:scale-95 transition-all"
            >
              <Text 
                style={{ color: isSelected ? '#FFFFFF' : colors.text }} 
                className="text-[10px] font-black uppercase tracking-wider"
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search Bar filter */}
      <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider mb-2">
        Search Synced Records
      </Text>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search member name or device ID..."
      />

      {/* Table of logs */}
      <View className="mt-5">
        <View className="flex-row justify-between items-center mb-3">
          <Text style={{ color: colors.text }} className="text-sm font-extrabold">
            Biometric Logs List
          </Text>
          <View className="bg-primary/10 px-2 py-0.5 rounded-lg">
            <Text className="text-primary text-[10px] font-extrabold">
              {filteredLogs.length} Records
            </Text>
          </View>
        </View>

        {filteredLogs.length === 0 ? (
          <Card className="py-12 items-center">
            <Ionicons name="file-tray-outline" size={32} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary }} className="text-xs font-bold mt-2">
              No synced biometric records for this date.
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-0.5 text-center">
              Try changing the date filter or click "Sync Attendance Log".
            </Text>
          </Card>
        ) : (
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border rounded-2xl overflow-hidden shadow-sm">
            {/* Table Header */}
            <View style={{ backgroundColor: colors.border }} className="flex-row p-3 border-b border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="flex-1 text-[9px] font-black uppercase">Member</Text>
              <Text style={{ color: colors.text }} className="w-[75px] text-[9px] font-black uppercase text-center">Time</Text>
              <Text style={{ color: colors.text }} className="w-[60px] text-[9px] font-black uppercase text-center">Direction</Text>
              <Text style={{ color: colors.text }} className="w-[70px] text-[9px] font-black uppercase text-center">Device</Text>
            </View>

            {/* Table Rows */}
            {filteredLogs.map((log) => (
              <View 
                key={log.id} 
                className="flex-row p-3 border-b border-gray-100 dark:border-gray-800 items-center last:border-b-0"
              >
                <Text style={{ color: colors.text }} className="flex-1 text-xs font-bold" numberOfLines={1}>
                  {log.name}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="w-[75px] text-[10px] font-bold text-center">
                  {log.time}
                </Text>
                <View className="w-[60px] items-center">
                  <Badge 
                    status={log.direction === 'IN' ? 'checked_in' : 'checked_out'} 
                  />
                </View>
                <Text style={{ color: colors.textSecondary }} className="w-[70px] text-[9px] font-bold text-center">
                  {log.deviceId}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
