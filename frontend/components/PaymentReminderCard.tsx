import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Member, Invoice } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currencyHelper';

interface PaymentReminderCardProps {
  member: Member;
  invoice: Invoice;
  onSendReminder: (member: Member, invoice: Invoice) => void;
}

export const PaymentReminderCard: React.FC<PaymentReminderCardProps> = ({
  member,
  invoice,
  onSendReminder
}) => {
  const { colors } = useTheme();

  return (
    <Card className="mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-accent mr-2" />
          <Text style={{ color: colors.text }} className="text-base font-bold">
            {member.name}
          </Text>
        </View>
        <Badge status={invoice.status} />
      </View>

      <Text style={{ color: colors.textSecondary }} className="text-xs mb-4 font-semibold">
        Outstanding amount: <Text style={{ color: colors.accent }} className="font-bold">{formatCurrency(invoice.total, invoice.currency)}</Text> for <Text className="font-bold">{invoice.planName}</Text>
      </Text>

      <View className="flex-row justify-between items-center border-t pt-3 border-gray-100 dark:border-gray-800">
        <View className="flex-row items-center">
          <Ionicons name="call-outline" size={14} color={colors.textSecondary} className="mr-1" />
          <Text style={{ color: colors.textSecondary }} className="text-[11px] font-semibold">
            {member.phone}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onSendReminder(member, invoice)}
          className="flex-row items-center bg-accent px-3 py-1.5 rounded-lg active:opacity-90 shadow-sm"
        >
          <Ionicons name="notifications-outline" size={12} color="#FFFFFF" className="mr-1" />
          <Text className="text-white font-bold text-[10px] uppercase">Alert Member</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};
export default PaymentReminderCard;
