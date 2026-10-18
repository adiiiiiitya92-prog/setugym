import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { formatDate } from '../utils/dateHelper';
import { Member } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currencyHelper';

interface MemberCardProps {
  member: Member;
  planName: string;
  onPress?: () => void;
  onEdit?: () => void;
  onRenew?: () => void;
  onDelete?: () => void;
  onBlock?: () => void;
  onAttendance?: () => void;
  onWhatsApp?: () => void;
  onCall?: () => void;
  onIDCard?: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  planName,
  onPress,
  onEdit,
  onRenew,
  onDelete,
  onBlock,
  onAttendance,
  onWhatsApp,
  onCall,
  onIDCard,
}) => {
  const { colors, isDark } = useTheme();

  // Determine accent color based on status
  const getStatusColor = (status: Member['status']) => {
    switch (status) {
      case 'active':
        return '#10B981'; // Emerald
      case 'expired':
        return '#F59E0B'; // Amber/Orange
      case 'pending':
        return '#3B82F6'; // Blue
      case 'inactive':
        return '#9CA3AF'; // Gray
      case 'blocked':
        return '#EF4444'; // Red
      default:
        return '#6C47FF'; // Purple
    }
  };

  const statusColor = getStatusColor(member.status);
  const planCurrency = member.planId ? 'INR' : 'INR'; // Default to INR or from member's currency context
  const dueAmt = member.dueAmount ?? 0;

  return (
    <Card 
      onPress={onPress} 
      style={{
        borderLeftWidth: 5,
        borderLeftColor: statusColor,
        shadowColor: isDark ? '#000' : '#888',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
        padding: 16,
        borderRadius: 20,
        backgroundColor: colors.card,
        marginBottom: 16,
      }}
    >
      {/* Header Area: Avatar, Info, Status, Delete */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <View style={{ borderColor: statusColor, borderWidth: 2, borderRadius: 99, padding: 2 }}>
            <Avatar name={member.name} uri={member.photoUrl} size={48} />
          </View>
          <View className="ml-3 flex-1">
            <Text 
              style={{ color: colors.text }} 
              className="text-base font-extrabold tracking-tight" 
              numberOfLines={1}
            >
              {member.name}
            </Text>
            {member.membershipId && (
              <View className="flex-row items-center mt-0.5">
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">
                  M ID: {member.membershipId}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Badge status={member.status} />
          {onDelete && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)' }}
              className="p-2 rounded-full active:scale-95"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Info Grid */}
      <View className="grid grid-cols-2 gap-y-2 mt-4 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">Mobile</Text>
            <Text style={{ color: colors.text }} className="text-xs font-semibold mt-0.5" numberOfLines={1}>
              {member.phone}
            </Text>
          </View>
          <View className="items-end">
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">Plan Expiry</Text>
            <Text 
              style={{ color: member.status === 'expired' ? '#EF4444' : '#10B981' }} 
              className="text-xs font-bold mt-0.5"
            >
              {formatDate(member.endDate)}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mt-2.5">
          <View>
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">Membership</Text>
            <Text style={{ color: colors.text }} className="text-xs font-bold mt-0.5" numberOfLines={1}>
              {planName}
            </Text>
          </View>
          <View className="items-end">
            <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">Due Amount</Text>
            <Text 
              style={{ color: dueAmt > 0 ? '#EF4444' : '#10B981' }} 
              className="text-xs font-extrabold mt-0.5"
            >
              {formatCurrency(dueAmt, planCurrency)}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Row Scrollbar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingVertical: 4, gap: 12 }}
        className="flex-row"
      >
        {onIDCard && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onIDCard();
            }}
            style={{ backgroundColor: 'rgba(108, 71, 255, 0.08)' }}
            className="flex-col items-center justify-center py-2 px-3.5 rounded-xl border border-primary/10"
          >
            <Ionicons name="card-outline" size={16} color="#6C47FF" />
            <Text className="text-[9px] font-bold text-primary mt-1 uppercase tracking-wide">ID Card</Text>
          </TouchableOpacity>
        )}

        {onCall && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onCall();
            }}
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)' }}
            className="flex-col items-center justify-center py-2 px-3.5 rounded-xl border border-blue-500/10"
          >
            <Ionicons name="call-outline" size={16} color="#3B82F6" />
            <Text className="text-[9px] font-bold text-blue-500 mt-1 uppercase tracking-wide">Call</Text>
          </TouchableOpacity>
        )}

        {onWhatsApp && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onWhatsApp();
            }}
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
            className="flex-col items-center justify-center py-2 px-3.5 rounded-xl border border-emerald-500/10"
          >
            <Ionicons name="logo-whatsapp" size={16} color="#10B981" />
            <Text className="text-[9px] font-bold text-emerald-500 mt-1 uppercase tracking-wide">Whatsapp</Text>
          </TouchableOpacity>
        )}

        {onAttendance && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onAttendance();
            }}
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
            className="flex-col items-center justify-center py-2 px-3.5 rounded-xl border border-amber-500/10"
          >
            <Ionicons name="finger-print-outline" size={16} color="#F59E0B" />
            <Text className="text-[9px] font-bold text-amber-500 mt-1 uppercase tracking-wide">Attendance</Text>
          </TouchableOpacity>
        )}

        {onRenew && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onRenew();
            }}
            style={{ backgroundColor: 'rgba(0, 200, 150, 0.08)' }}
            className="flex-col items-center justify-center py-2 px-3.5 rounded-xl border border-secondary/10"
          >
            <Ionicons name="sync-outline" size={16} color="#00C896" />
            <Text className="text-[9px] font-bold text-secondary mt-1 uppercase tracking-wide">Renew Plan</Text>
          </TouchableOpacity>
        )}

        {onBlock && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onBlock();
            }}
            style={{ 
              backgroundColor: member.status === 'blocked' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)' 
            }}
            className={`flex-col items-center justify-center py-2 px-3.5 rounded-xl border ${
              member.status === 'blocked' ? 'border-emerald-500/10' : 'border-red-500/10'
            }`}
          >
            <Ionicons 
              name={member.status === 'blocked' ? "checkmark-circle-outline" : "ban-outline"} 
              size={16} 
              color={member.status === 'blocked' ? "#10B981" : "#EF4444"} 
            />
            <Text 
              style={{ color: member.status === 'blocked' ? "#10B981" : "#EF4444" }} 
              className="text-[9px] font-bold mt-1 uppercase tracking-wide"
            >
              {member.status === 'blocked' ? "Unblock" : "Block"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Card>
  );
};

export default MemberCard;
