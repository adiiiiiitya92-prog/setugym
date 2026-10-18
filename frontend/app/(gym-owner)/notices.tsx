import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { NoticeCard } from '../../components/NoticeCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { validateRequired } from '../../utils/validators';
import { formatDate } from '../../utils/dateHelper';
import { Notice, AppNotification } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { triggerLocalNotification } from '../../utils/notificationService';
import { API_BASE_URL } from '../../utils/apiConfig';

export default function NoticesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { notices, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [audience, setAudience] = useState<'everyone' | 'members' | 'trainers' | 'receptionists' | 'admins'>('everyone');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Filter notices by gym branch
  const gymNotices = useMemo(() => notices.filter(n => n.gymId === activeGymId), [notices, activeGymId]);

  // 2. Search query filtration
  const searchedNotices = useSearch(gymNotices, searchQuery, ['title', 'body']);

  const handleOpenAdd = () => {
    setTitle('');
    setBody('');
    setPriority('normal');
    setAudience('everyone');
    setErrors({});
    setModalVisible(true);
  };

  const handleAddNotice = async () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(title)) tempErrors.title = "Announcement title is required.";
    if (!validateRequired(body)) tempErrors.body = "Message body content is required.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill all mandatory fields.");
      return;
    }

    const noticeId = `notice-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newNotice: Notice = {
      id: noticeId,
      title,
      body,
      priority,
      date: formatDate(new Date(), "yyyy-MM-dd"),
      gymId: activeGymId,
      audience
    };

    // 1. Dispatch notice addition to Context
    dispatch({ type: 'ADD_NOTICE', payload: newNotice });

    // 2. Dispatch notification addition to local state (to view in Notification Center)
    const newNotification: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      body,
      timestamp,
      audience,
      read: false,
      priority,
      relatedId: noticeId
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // 3. Post to backend Express notifications API for delivery logs database
    try {
      await fetch(`${API_BASE_URL}/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          audience,
          priority,
          senderId: user?.id || 'owner-active-1',
          gymId: activeGymId
        })
      });
    } catch (e) {
      console.warn("Could not reach backend notification logs API server", e);
    }

    // 4. Trigger Native push notification immediately on the device
    await triggerLocalNotification({
      title,
      body,
      priority,
      data: { noticeId }
    });

    toast.success("Broadcast notice published and FCM notifications triggered!");
    setModalVisible(false);
  };

  const handleDeleteNotice = (noticeId: string, noticeTitle: string) => {
    Alert.alert(
      "Remove Announcement",
      `Are you sure you want to delete "${noticeTitle}" notice from active member dashboards?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dispatch({ type: 'DELETE_NOTICE', payload: noticeId });
            toast.error("Announcement removed.");
          }
        }
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search posted announcements..."
      />

      <FlatList
        data={searchedNotices}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => (
          <NoticeCard
            notice={item}
            onDelete={() => handleDeleteNotice(item.id, item.title)}
          />
        )}
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">📢</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Announcements</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
              Tap the FAB below to broadcast notices to your fitness members and trainers!
            </Text>
          </Card>
        }
      />

      {/* FAB trigger */}
      <TouchableOpacity
        onPress={handleOpenAdd}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ADD NOTICE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Broadcast Announcement
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Announcement Title"
                placeholder="e.g. Memorial Day Gym Hours"
                value={title}
                onChangeText={setTitle}
                error={errors.title}
                icon="megaphone-outline"
              />

              <Input
                label="Announcement Message"
                placeholder="Write description guidelines here..."
                value={body}
                onChangeText={setBody}
                error={errors.body}
                multiline={true}
                numberOfLines={4}
                style={{ textAlignVertical: 'top' }}
                icon="document-text-outline"
              />

              {/* Priority select */}
              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Broadcast Priority</Text>
              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity
                  onPress={() => setPriority('normal')}
                  style={{
                    borderColor: priority === 'normal' ? '#6C47FF' : colors.border,
                    backgroundColor: priority === 'normal' ? 'rgba(108,71,255,0.08)' : 'transparent'
                  }}
                  className="flex-1 py-3 border rounded-xl items-center"
                >
                  <Text style={{ color: priority === 'normal' ? '#6C47FF' : colors.text }} className="text-xs font-bold">Normal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPriority('urgent')}
                  style={{
                    borderColor: priority === 'urgent' ? '#FF6B35' : colors.border,
                    backgroundColor: priority === 'urgent' ? 'rgba(255,107,53,0.08)' : 'transparent'
                  }}
                  className="flex-1 py-3 border rounded-xl items-center"
                >
                  <Text style={{ color: priority === 'urgent' ? '#FF6B35' : colors.text }} className="text-xs font-bold">Urgent</Text>
                </TouchableOpacity>
              </View>

              {/* Target Select */}
              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Target Audience Group</Text>
              <View className="flex-row flex-wrap gap-2.5 mb-6">
                {(['everyone', 'members', 'trainers', 'receptionists', 'admins'] as const).map((aud) => (
                  <TouchableOpacity
                    key={aud}
                    onPress={() => setAudience(aud)}
                    style={{
                      borderColor: audience === aud ? '#6C47FF' : colors.border,
                      backgroundColor: audience === aud ? 'rgba(108,71,255,0.08)' : 'transparent',
                      width: aud === 'everyone' ? '100%' : '47%'
                    }}
                    className="py-2.5 border rounded-xl items-center"
                  >
                    <Text style={{ color: audience === aud ? '#6C47FF' : colors.text }} className="text-[10px] font-bold uppercase">
                      {aud}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="Post Announcement"
                onPress={handleAddNotice}
                className="rounded-xl mb-6"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
