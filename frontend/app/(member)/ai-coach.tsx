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
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import {
  ChatMessage,
  extractMemberProfileContext,
  sendWorkoutChatMessage
} from '../../services/aiService';

const SUGGESTED_PROMPTS = [
  { label: '💪 Tailored 3-Day Split', prompt: 'Create a tailored 3-day workout split for my body stats. Include exercises, sets, reps, and rest.' },
  { label: '🔥 Fat Burn & Core', prompt: 'Suggest an effective fat-burning and core workout routine suitable for my weight and fitness level.' },
  { label: '🏋️ Muscle Hypertrophy', prompt: 'Give me a hypertrophy routine focused on chest, back, and arms tailored to my current BMI.' },
  { label: '⚡ 30-Min Quick Session', prompt: 'I only have 30 minutes today. Give me an intense, time-efficient full-body workout.' },
  { label: '🧘 Mobility & Lower Back', prompt: 'Suggest a routine to improve posture, hip mobility, and relieve lower back tightness.' }
];

export default function MemberAiCoachScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const memberId = user?.id || 'member-john';
  const member = useMemo(() => {
    return gymContext?.members?.find(m => m.id === memberId) || null;
  }, [gymContext?.members, memberId]);

  const plan = useMemo(() => {
    if (!member || !gymContext?.memberPlans) return null;
    return gymContext.memberPlans.find(p => p.id === member.planId);
  }, [member, gymContext?.memberPlans]);

  const profileContext = useMemo(() => {
    return extractMemberProfileContext(member, plan?.name);
  }, [member, plan]);

  // Initial welcome message tailored to profile
  const initialGreeting = useMemo<ChatMessage>(() => {
    const name = profileContext.name || 'Friend';
    const weightStr = profileContext.weight ? `${profileContext.weight} kg` : 'recorded';
    const bmiStr = profileContext.bmi ? `BMI: ${profileContext.bmi}` : '';

    return {
      id: 'msg-welcome',
      role: 'assistant',
      content: `👋 Hi **${name}**! I'm your **Setu AI Workout Coach**.\n\nI've analyzed your profile (${weightStr}${bmiStr ? `, ${bmiStr}` : ''}). What are your training goals today? Tap a quick prompt below or ask me for any tailored workout split, exercise form cues, or sets & reps!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }, [profileContext]);

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  // Scroll to bottom when message list changes
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

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
      const reply = await sendWorkoutChatMessage(newHistory, profileContext, 'member');

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      toast.error(err.message || 'Unable to get advice right now.');
      const errorMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Sorry, I encountered a temporary connection issue. Please make sure your internet is working and try again.',
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

  const handleClear = () => {
    setMessages([initialGreeting]);
    toast.info('Chat conversation reset.');
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
            maxWidth: '82%',
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

          <View className="flex-row items-center justify-between mt-2.5 pt-1.5 border-t border-black/5 dark:border-white/5">
            <Text
              style={{ color: isUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary }}
              className="text-[10px]"
            >
              {item.timestamp}
            </Text>

            {!isUser && item.id !== 'msg-welcome' && (
              <TouchableOpacity
                onPress={() => handleCopy(item.content)}
                className="flex-row items-center px-2 py-0.5 rounded bg-primary/10"
              >
                <Ionicons name="copy-outline" size={12} color="#6C47FF" />
                <Text style={{ color: '#6C47FF' }} className="text-[10px] font-bold ml-1">
                  Copy
                </Text>
              </TouchableOpacity>
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
      {/* Top Physiological Summary Card */}
      <View className="px-4 pt-3 pb-2">
        <Card noPadding className="p-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-primary/15 items-center justify-center mr-2">
                <Ionicons name="fitness-outline" size={18} color="#6C47FF" />
              </View>
              <View>
                <Text style={{ color: colors.text }} className="text-sm font-black">
                  AI Workout Coach
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-[10px]">
                  Tuned for {profileContext.name}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClear}
              className="px-2 py-1 rounded-lg bg-red-500/10 flex-row items-center"
            >
              <Ionicons name="trash-outline" size={12} color="#EF4444" />
              <Text className="text-red-500 text-[10px] font-bold ml-1">Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Metrics Bar */}
          <View className="flex-row justify-between pt-2 border-t border-border/20">
            <View className="items-center flex-1">
              <Text style={{ color: colors.textSecondary }} className="text-[9px] uppercase font-bold">
                Weight
              </Text>
              <Text style={{ color: colors.text }} className="text-xs font-black">
                {profileContext.weight ? `${profileContext.weight} kg` : '—'}
              </Text>
            </View>

            <View className="w-[1px] bg-border/20 h-full" />

            <View className="items-center flex-1">
              <Text style={{ color: colors.textSecondary }} className="text-[9px] uppercase font-bold">
                Height
              </Text>
              <Text style={{ color: colors.text }} className="text-xs font-black">
                {profileContext.height ? `${profileContext.height} cm` : '—'}
              </Text>
            </View>

            <View className="w-[1px] bg-border/20 h-full" />

            <View className="items-center flex-1">
              <Text style={{ color: colors.textSecondary }} className="text-[9px] uppercase font-bold">
                BMI
              </Text>
              <Text
                style={{
                  color: !profileContext.bmi
                    ? colors.text
                    : profileContext.bmi < 25 && profileContext.bmi >= 18.5
                    ? '#10B981'
                    : '#F59E0B'
                }}
                className="text-xs font-black"
              >
                {profileContext.bmi || '—'}
              </Text>
            </View>

            <View className="w-[1px] bg-border/20 h-full" />

            <View className="items-center flex-1">
              <Text style={{ color: colors.textSecondary }} className="text-[9px] uppercase font-bold">
                Gender
              </Text>
              <Text style={{ color: colors.text }} className="text-xs font-black">
                {profileContext.gender || '—'}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Suggested Quick Prompt Carousel */}
      <View className="py-2">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SUGGESTED_PROMPTS}
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

      {/* Chat Messages Stream */}
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
                Setu Coach is designing your personalized routine...
              </Text>
            </View>
          ) : null
        }
      />

      {/* Chat Input Bar */}
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
          placeholder="Ask for custom workouts, sets, or exercises..."
          placeholderTextColor={colors.textSecondary}
          style={{
            backgroundColor: colors.background,
            color: colors.text,
            borderColor: colors.border
          }}
          className="flex-1 px-4 py-2.5 rounded-xl border text-sm mr-2"
          multiline
          maxLength={400}
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
