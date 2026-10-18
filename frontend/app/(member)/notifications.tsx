import React, { useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../utils/dateHelper';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../hooks/useToast';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { notifications, dispatch } = gymContext;

  // Filter notifications targeted to everyone or members
  const memberNotifications = useMemo(() => {
    return notifications.filter(n => n.audience === 'everyone' || n.audience === 'members');
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return memberNotifications.filter(n => !n.read).length;
  }, [memberNotifications]);

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
      {/* Header operations */}
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
        data={memberNotifications}
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
              No new alerts or announcement notifications recorded.
            </Text>
          </Card>
        }
      />
    </View>
  );
}
