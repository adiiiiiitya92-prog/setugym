import React, { useContext, useMemo, useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/dateHelper';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../hooks/useToast';

import { API_BASE_URL } from '../../utils/apiConfig';

export default function OwnerNotificationsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { notifications, dispatch } = gymContext;

  const [activeTab, setActiveTab] = useState<'notifications' | 'delivery_logs'>('notifications');
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Filter notifications targeted to everyone or admins/owners
  const ownerNotifications = useMemo(() => {
    return notifications.filter(n => n.audience === 'everyone' || n.audience === 'admins');
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return ownerNotifications.filter(n => !n.read).length;
  }, [ownerNotifications]);

  // Fetch Delivery Logs from Express backend
  const fetchDeliveryLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/logs`);
      if (response.ok) {
        const data = await response.json();
        setDeliveryLogs(data);
      }
    } catch (e) {
      console.warn("Could not load backend logs. Ensure server is active.", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'delivery_logs') {
      fetchDeliveryLogs();
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'delivery_logs') {
      await fetchDeliveryLogs();
    }
    setRefreshing(false);
  };

  const handleMarkAllRead = () => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
    toast.success("All notifications marked as read.");
  };

  const handleToggleRead = (id: string, currentlyRead: boolean) => {
    if (!currentlyRead) {
      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    }
  };

  const handleDeleteNotification = (id: string) => {
    dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
    toast.error("Notification removed.");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      {/* Sub tabs selector */}
      <View className="flex-row mb-5 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
        <TouchableOpacity
          onPress={() => setActiveTab('notifications')}
          style={{ backgroundColor: activeTab === 'notifications' ? '#6C47FF' : 'transparent' }}
          className="flex-1 py-2.5 rounded-lg items-center"
        >
          <Text 
            style={{ color: activeTab === 'notifications' ? '#FFFFFF' : colors.textSecondary }} 
            className="text-[10px] font-extrabold uppercase tracking-wide"
          >
            My Inbox ({unreadCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('delivery_logs')}
          style={{ backgroundColor: activeTab === 'delivery_logs' ? '#6C47FF' : 'transparent' }}
          className="flex-1 py-2.5 rounded-lg items-center"
        >
          <Text 
            style={{ color: activeTab === 'delivery_logs' ? '#FFFFFF' : colors.textSecondary }} 
            className="text-[10px] font-extrabold uppercase tracking-wide"
          >
            FCM Delivery Logs
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'notifications' ? (
        <View style={{ flex: 1 }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ color: colors.text }} className="text-sm font-extrabold">
              {unreadCount} Unread Notifications
            </Text>
            {unreadCount > 0 && (
              <TouchableOpacity 
                onPress={handleMarkAllRead}
                className="px-3 py-1.5 bg-primary/10 rounded-lg"
              >
                <Text className="text-primary font-bold text-[10px] uppercase">Mark All Read</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={ownerNotifications}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleToggleRead(item.id, item.read)}
                activeOpacity={item.read ? 1 : 0.7}
                className="mb-3"
              >
                <Card 
                  noPadding 
                  style={{
                    borderColor: !item.read ? '#6C47FF' : colors.border,
                    borderWidth: !item.read ? 1.5 : 1,
                    backgroundColor: !item.read ? 'rgba(108, 71, 255, 0.04)' : colors.card,
                  }}
                  className="p-4"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center flex-1 pr-2">
                      {!item.read && (
                        <View className="w-2.5 h-2.5 bg-primary rounded-full mr-2" />
                      )}
                      <Text style={{ color: colors.text }} className="text-sm font-black flex-1 leading-4">
                        {item.title}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      {item.priority === 'urgent' && <Badge status="Urgent" />}
                      <TouchableOpacity 
                        onPress={() => handleDeleteNotification(item.id)}
                        className="p-1"
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={{ color: colors.textSecondary }} className="text-xs leading-5 font-semibold mb-2.5 pl-0.5">
                    {item.body}
                  </Text>

                  <View className="flex-row justify-between items-center pl-0.5 mt-1">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={11} color={colors.textSecondary} className="mr-1" />
                      <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold">
                        {formatDate(item.timestamp, "PPpp")}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary }} className="text-[9px] font-extrabold uppercase tracking-wide">
                      Audience: {item.audience}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Card className="items-center py-12">
                <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} className="mb-3" />
                <Text style={{ color: colors.text }} className="text-base font-black">All Caught Up!</Text>
                <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
                  No notifications recorded.
                </Text>
              </Card>
            }
          />
        </View>
      ) : (
        // FCM Audit delivery logs list view
        <FlatList
          data={deliveryLogs}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => (
            <Card className="mb-3 p-4">
              <View className="flex-row justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2.5 mb-2.5">
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
                  <Text style={{ color: colors.text }} className="text-sm font-extrabold flex-1" numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
                <View className="bg-emerald-500/10 px-2 py-0.5 rounded">
                  <Text className="text-emerald-500 text-[8px] font-black uppercase">{item.status}</Text>
                </View>
              </View>

              <View className="flex-row justify-between mb-2">
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Target Group</Text>
                <Text style={{ color: colors.text }} className="text-xs font-bold capitalize">{item.audience}</Text>
              </View>

              <View className="flex-row justify-between mb-2">
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Delivery Scope (FCM Logs)</Text>
                <Text style={{ color: colors.text }} className="text-xs font-semibold">
                  🎯 <Text className="font-extrabold text-primary">{item.targetCount} Devices</Text>
                </Text>
              </View>

              <View className="flex-row justify-between mb-2.5">
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Status Breakdown</Text>
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold">
                  ✅ <Text style={{ color: '#00C896' }} className="font-bold">{item.deliveredCount}</Text>
                  {"  |  "}
                  ❌ <Text style={{ color: '#FF6B35' }} className="font-bold">{item.failedCount}</Text>
                </Text>
              </View>

              <View className="border-t border-gray-50 dark:border-gray-800 pt-2 flex-row justify-between items-center">
                <Text style={{ color: colors.textSecondary }} className="text-[8px] font-bold">FCM PRODUCTION API TRANSACTION</Text>
                <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold">
                  {formatDate(item.timestamp, "PPpp")}
                </Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <Card className="items-center py-12">
              <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} className="mb-3" />
              <Text style={{ color: colors.text }} className="text-base font-black">No Delivery History</Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
                Swipe down to refresh or broadcast new announcements!
              </Text>
            </Card>
          }
        />
      )}
    </View>
  );
}
