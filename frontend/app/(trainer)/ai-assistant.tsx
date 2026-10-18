import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import { Member, WorkoutPlan } from '../../types';
import {
  ChatMessage,
  extractMemberProfileContext,
  sendWorkoutChatMessage
} from '../../services/aiService';

export default function TrainerAiAssistantScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const trainerId = user?.id || 'trainer-1';

  const members = useMemo(() => {
    if (!gymContext?.members) return [];
    // Prioritize trainer's assigned clients, then all gym members
    const gymMembers = gymContext.members.filter(m => m.gymId === activeGymId);
    return gymMembers.sort((a, b) => {
      const aAssigned = a.assignedTrainerId === trainerId ? 1 : 0;
      const bAssigned = b.assignedTrainerId === trainerId ? 1 : 0;
      return bAssigned - aAssigned;
    });
  }, [gymContext?.members, activeGymId, trainerId]);

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members[0]?.id || ''
  );

  useEffect(() => {
    if (!selectedMemberId && members.length > 0) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  const selectedMember = useMemo<Member | null>(() => {
    return members.find(m => m.id === selectedMemberId) || members[0] || null;
  }, [members, selectedMemberId]);

  const selectedPlan = useMemo(() => {
    if (!selectedMember || !gymContext?.memberPlans) return null;
    return gymContext.memberPlans.find(p => p.id === selectedMember.planId);
  }, [selectedMember, gymContext?.memberPlans]);

  const profileContext = useMemo(() => {
    return extractMemberProfileContext(selectedMember, selectedPlan?.name);
  }, [selectedMember, selectedPlan]);

  // Initial welcome message
  const initialGreeting = useMemo<ChatMessage>(() => {
    const clientName = profileContext.name || 'your client';
    const weightStr = profileContext.weight ? `${profileContext.weight} kg` : 'N/A';
    const bmiStr = profileContext.bmi ? `BMI: ${profileContext.bmi}` : 'Standard baseline';

    return {
      id: 'msg-trainer-welcome',
      role: 'assistant',
      content: `🏋️ **Trainer AI Assistant Active**\n\nClient selected: **${clientName}**\n• Weight: ${weightStr}\n• Height: ${profileContext.height ? `${profileContext.height} cm` : 'N/A'}\n• ${bmiStr}\n\nI can help you build custom periodized splits, exercise regressions/progressions, or injury-friendly routines for this client. Tap a prompt or ask below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }, [profileContext]);

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  // When client changes, notify in chat
  const handleSelectMember = (member: Member) => {
    if (member.id === selectedMemberId) return;
    setSelectedMemberId(member.id);

    const context = extractMemberProfileContext(member);
    const weightStr = context.weight ? `${context.weight} kg` : 'N/A';
    const bmiStr = context.bmi ? `BMI: ${context.bmi}` : 'standard baselines';

    const switchMsg: ChatMessage = {
      id: `switch-${Date.now()}`,
      role: 'assistant',
      content: `🔄 **Client Switched to ${member.name}**\n• Weight: ${weightStr} | Height: ${context.height ? `${context.height} cm` : 'N/A'} | ${bmiStr}\n\nWhat workout program would you like to design for ${member.name}?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, switchMsg]);
  };

  // Scroll to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  const trainerPrompts = useMemo(() => {
    const name = selectedMember?.name || 'Client';
    return [
      { label: `📋 4-Day Hypertrophy Plan`, prompt: `Design a professional 4-day Upper/Lower hypertrophy workout split for ${name} based on their body stats. Include exercise names, sets, reps, and rest periods.` },
      { label: `🏃 Fat Burn & Conditioning`, prompt: `Create an intensive fat-loss & conditioning circuit program tailored to ${name}'s current weight and BMI.` },
      { label: `🩹 Joint-Friendly / Low-Impact`, prompt: `Suggest a joint-friendly, low-impact strength program for ${name} that minimizes knee and lower-back strain.` },
      { label: `💥 High-Volume Push/Pull/Legs`, prompt: `Generate a 3-day Push/Pull/Legs program with progressive overload volume for ${name}.` },
      { label: `🔄 Deload & Active Recovery`, prompt: `Create an active recovery and mobility routine for ${name} for a deload week.` }
    ];
  }, [selectedMember]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isTyping) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    setIsTyping(true);

    try {
      const reply = await sendWorkoutChatMessage(newHistory, profileContext, 'trainer');

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      toast.error(err.message || 'Unable to get trainer advice.');
      const errorMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Connection error. Please check your network and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (content: string) => {
    Clipboard.setString(content);
    toast.success('Workout advice copied to clipboard!');
  };

  const handleSaveAsWorkoutPlan = (content: string) => {
    if (!gymContext?.dispatch || !selectedMember) {
      Clipboard.setString(content);
      toast.success('Workout copied to clipboard!');
      return;
    }

    // Create a new workout plan in context
    const newPlan: WorkoutPlan = {
      id: `workout-ai-${Date.now()}`,
      title: `AI Routine: ${selectedMember.name}`,
      goal: profileContext.bmi && profileContext.bmi > 25 ? 'Fat Loss & Conditioning' : 'Strength & Hypertrophy',
      daysPerWeek: 3,
      schedule: {
        'Day 1 - Push & Core': [
          { name: 'Barbell/Dumbbell Bench Press', sets: 4, reps: '8-12', restSeconds: 60, notes: 'Focus on full pectoral stretch' },
          { name: 'Overhead Shoulder Press', sets: 3, reps: '10', restSeconds: 60, notes: 'Keep core tight' },
          { name: 'Tricep Rope Pushdowns', sets: 3, reps: '12-15', restSeconds: 45, notes: 'Squeeze triceps at lockout' }
        ],
        'Day 2 - Pull & Back': [
          { name: 'Lat Pulldown / Pull-ups', sets: 4, reps: '8-10', restSeconds: 60, notes: 'Drive elbows downward' },
          { name: 'Seated Cable Row', sets: 3, reps: '10-12', restSeconds: 60, notes: 'Retract scapula at peak contraction' },
          { name: 'Dumbbell Bicep Curls', sets: 3, reps: '12', restSeconds: 45, notes: 'Controlled eccentric tempo' }
        ],
        'Day 3 - Legs & Lower Body': [
          { name: 'Goblet / Barbell Squats', sets: 4, reps: '10', restSeconds: 90, notes: 'Knees tracking over toes' },
          { name: 'Romanian Deadlifts', sets: 3, reps: '10', restSeconds: 75, notes: 'Hinge hips back, feel hamstring stretch' },
          { name: 'Standing Calf Raises', sets: 4, reps: '15', restSeconds: 45, notes: 'Full extension at top' }
        ]
      },
      assignedMemberId: selectedMember.id,
      gymId: activeGymId
    };

    gymContext.dispatch({
      type: 'ADD_WORKOUT',
      payload: newPlan
    });

    Clipboard.setString(content);
    toast.success(`Workout Plan saved & assigned to ${selectedMember.name}!`);
  };

  const handleClear = () => {
    setMessages([initialGreeting]);
    toast.info('Trainer conversation reset.');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View className={`my-2 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <View
            style={{ backgroundColor: '#6C47FF' }}
            className="w-8 h-8 rounded-full items-center justify-center mr-2 mt-1 shadow-sm"
          >
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          </View>
        )}

        <View
          style={{
            maxWidth: '84%',
            backgroundColor: isUser ? '#6C47FF' : colors.card,
            borderColor: isUser ? '#6C47FF' : colors.border,
            borderWidth: 1,
            borderRadius: 18,
            borderBottomRightRadius: isUser ? 4 : 18,
            borderBottomLeftRadius: isUser ? 18 : 4
          }}
          className="p-4 shadow-sm"
        >
          <Text
            style={{
              color: isUser ? '#FFFFFF' : colors.text,
              fontSize: 14,
              lineHeight: 20
            }}
          >
            {item.content}
          </Text>

          <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-black/5 dark:border-white/5">
            <Text
              style={{ color: isUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary }}
              className="text-[10px]"
            >
              {item.timestamp}
            </Text>

            {!isUser && item.id !== 'msg-trainer-welcome' && (
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => handleCopy(item.content)}
                  className="flex-row items-center px-2 py-1 rounded bg-primary/10"
                >
                  <Ionicons name="copy-outline" size={12} color="#6C47FF" />
                  <Text style={{ color: '#6C47FF' }} className="text-[10px] font-bold ml-1">
                    Copy
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSaveAsWorkoutPlan(item.content)}
                  className="flex-row items-center px-2 py-1 rounded bg-emerald-500/10"
                >
                  <Ionicons name="bookmark-outline" size={12} color="#10B981" />
                  <Text className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold ml-1">
                    Save Plan
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Client Selector Carousel */}
      <View className="pt-3 pb-1 border-b border-border/20">
        <View className="flex-row items-center justify-between px-4 mb-2">
          <Text style={{ color: colors.textSecondary }} className="text-[10px] uppercase font-bold tracking-wider">
            Select Trainee to Prescribe
          </Text>
          <TouchableOpacity
            onPress={handleClear}
            className="flex-row items-center px-2 py-0.5 rounded bg-red-500/10"
          >
            <Ionicons name="trash-outline" size={11} color="#EF4444" />
            <Text className="text-red-500 text-[10px] font-bold ml-1">Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {members.map(m => {
            const isSelected = m.id === selectedMemberId;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => handleSelectMember(m)}
                style={{
                  backgroundColor: isSelected ? 'rgba(108,71,255,0.12)' : colors.card,
                  borderColor: isSelected ? '#6C47FF' : colors.border
                }}
                className="flex-row items-center px-3 py-2 rounded-xl border mr-2 shadow-xs"
              >
                <Avatar name={m.name} uri={m.photoUrl} size={24} />
                <Text
                  style={{
                    color: isSelected ? '#6C47FF' : colors.text,
                    fontWeight: isSelected ? '800' : '600'
                  }}
                  className="text-xs ml-2"
                >
                  {m.name}
                </Text>
                {m.assignedTrainerId === trainerId && (
                  <View className="w-2 h-2 rounded-full bg-emerald-500 ml-1.5" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Member Metrics Snapshot Bar */}
      {selectedMember && (
        <View className="px-4 pt-2.5 pb-1">
          <Card noPadding className="p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Avatar name={selectedMember.name} uri={selectedMember.photoUrl} size={36} />
                <View className="ml-2.5 flex-1">
                  <Text style={{ color: colors.text }} className="text-sm font-black">
                    {selectedMember.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[10px]">
                    {selectedPlan?.name || 'Membership'} • {selectedMember.gender || 'Member'}
                  </Text>
                </View>
              </View>

              {/* BMI Pill */}
              <View
                style={{
                  backgroundColor: !profileContext.bmi
                    ? 'rgba(108,71,255,0.1)'
                    : profileContext.bmi < 25 && profileContext.bmi >= 18.5
                    ? 'rgba(16,185,129,0.15)'
                    : 'rgba(245,158,11,0.15)'
                }}
                className="px-2.5 py-1 rounded-full items-center"
              >
                <Text
                  style={{
                    color: !profileContext.bmi
                      ? '#6C47FF'
                      : profileContext.bmi < 25 && profileContext.bmi >= 18.5
                      ? '#10B981'
                      : '#F59E0B'
                  }}
                  className="text-[10px] font-black"
                >
                  BMI {profileContext.bmi || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Metrics row */}
            <View className="flex-row justify-between pt-2 mt-2 border-t border-border/20">
              <View className="items-center flex-1">
                <Text style={{ color: colors.textSecondary }} className="text-[9px] uppercase font-bold">Weight</Text>
                <Text style={{ color: colors.text }} className="text-xs font-black">
                  {profileContext.weight ? `${profileContext.weight} kg` : '—'}
                </Text>
              </View>
              <View className="w-[1px] bg-border/20 h-full" />
              <View className="items-center flex-1">
                <Text style={{ color: colors.textSecondary }} className="text-[9px] uppercase font-bold">Height</Text>
                <Text style={{ color: colors.text }} className="text-xs font-black">
                  {profileContext.height ? `${profileContext.height} cm` : '—'}
                </Text>
              </View>
              <View className="w-[1px] bg-border/20 h-full" />
              <View className="items-center flex-1">
                <Text style={{ color: colors.textSecondary }} className="text-[9px] uppercase font-bold">Chest / Waist</Text>
                <Text style={{ color: colors.text }} className="text-xs font-black">
                  {profileContext.chest ? `${profileContext.chest}" / ${profileContext.waist || '—'}"` : '—'}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Suggested Trainer Prompts Carousel */}
      <View className="py-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={trainerPrompts}
          keyExtractor={(item) => item.label}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSend(item.prompt)}
              disabled={isTyping}
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border
              }}
              className="mr-2 px-3 py-2 rounded-xl border flex-row items-center shadow-xs"
            >
              <Text style={{ color: colors.text }} className="text-xs font-bold">
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Message Stream */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListFooterComponent={
          isTyping ? (
            <View className="my-2 flex-row items-center p-3 rounded-2xl bg-card border border-border self-start">
              <ActivityIndicator size="small" color="#6C47FF" />
              <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold ml-2">
                Trainer AI is analyzing {selectedMember?.name || 'trainee'}&apos;s profile...
              </Text>
            </View>
          ) : null
        }
      />

      {/* Input Field */}
      <View
        style={{
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1
        }}
        className="p-3 flex-row items-center"
      >
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={`Ask AI to program workouts for ${selectedMember?.name || 'client'}...`}
          placeholderTextColor={colors.textSecondary}
          style={{
            backgroundColor: colors.background,
            color: colors.text,
            borderColor: colors.border
          }}
          className="flex-1 px-4 py-2.5 rounded-xl border text-sm mr-2"
          multiline
          maxLength={500}
          editable={!isTyping}
          onSubmitEditing={() => handleSend()}
        />

        <TouchableOpacity
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
          style={{
            backgroundColor: inputText.trim() && !isTyping ? '#6C47FF' : colors.border
          }}
          className="w-11 h-11 rounded-xl items-center justify-center shadow-sm"
        >
          {isTyping ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
