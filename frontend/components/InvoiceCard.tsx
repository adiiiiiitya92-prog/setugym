import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { formatDate } from '../utils/dateHelper';
import { Invoice } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currencyHelper';

interface InvoiceCardProps {
  invoice: Invoice;
  onPrint?: (invoice: Invoice) => void;
  onSendSimulated?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onWhatsApp?: (invoice: Invoice) => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onPrint,
  onSendSimulated,
  onEdit,
  onDelete,
  onWhatsApp
}) => {
  const { colors } = useTheme();

  return (
    <Card className="mb-4">
      {/* Header Row */}
      <View className="flex-row justify-between items-start border-b pb-3 mb-3 border-gray-100 dark:border-gray-800">
        <View>
          <Text style={{ color: colors.text }} className="text-[10px] font-black uppercase tracking-wider text-primary">
            {invoice.invoiceNo}
          </Text>
          <Text style={{ color: colors.text }} className="text-base font-bold mt-0.5">
            {invoice.memberName}
          </Text>
        </View>
        <Badge status={invoice.status} />
      </View>

      {/* Main Details */}
      <View className="space-y-1 mb-4">
        <View className="flex-row justify-between">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Plan</Text>
          <Text style={{ color: colors.text }} className="text-xs font-bold">{invoice.planName}</Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Invoice Date</Text>
          <Text style={{ color: colors.text }} className="text-xs font-semibold">{formatDate(invoice.date)}</Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Due Date</Text>
          <Text style={{ color: colors.text }} className="text-xs font-semibold">{formatDate(invoice.dueDate)}</Text>
        </View>

        <View className="flex-row justify-between border-t border-dashed mt-2 pt-2 border-gray-100 dark:border-gray-800">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Subtotal</Text>
          <Text style={{ color: colors.text }} className="text-xs font-semibold">{formatCurrency(invoice.subtotal, invoice.currency)}</Text>
        </View>
        <View className="flex-row justify-between mt-0.5">
          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">GST (18%)</Text>
          <Text style={{ color: colors.text }} className="text-xs font-semibold">{formatCurrency(invoice.tax, invoice.currency)}</Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text style={{ color: colors.text }} className="text-sm font-black">Total</Text>
          <Text style={{ color: '#6C47FF' }} className="text-base font-black">{formatCurrency(invoice.total, invoice.currency)}</Text>
        </View>

        {invoice.hasInstallments && (
          <View className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-850">
            <Text style={{ color: colors.text }} className="text-[9px] font-black uppercase tracking-wider mb-2 text-primary">Installment Billing Breakdown</Text>
            
            <View className="flex-row justify-between mb-1.5">
              <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">1st Installment</Text>
              <View className="flex-row items-center gap-1.5">
                <Text style={{ color: colors.text }} className="text-[10px] font-bold">
                  {formatCurrency(invoice.firstInstallmentAmount || 0, invoice.currency)}
                </Text>
                <Text style={{ color: invoice.firstInstallmentStatus === 'paid' ? '#00C896' : '#FF6B35' }} className="text-[9px] font-black uppercase">
                  {invoice.firstInstallmentStatus}
                </Text>
              </View>
            </View>
            
            <View className="flex-row justify-between mt-1">
              <View>
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">2nd Installment</Text>
                {invoice.secondInstallmentDueDate && (
                  <Text style={{ color: colors.textSecondary }} className="text-[8px] mt-0.5">
                    Due: {formatDate(invoice.secondInstallmentDueDate)}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center gap-1.5">
                <Text style={{ color: colors.text }} className="text-[10px] font-bold">
                  {formatCurrency(invoice.secondInstallmentAmount || 0, invoice.currency)}
                </Text>
                <Text style={{ color: invoice.secondInstallmentStatus === 'paid' ? '#00C896' : '#FF6B35' }} className="text-[9px] font-black uppercase">
                  {invoice.secondInstallmentStatus}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View className="flex-row gap-2 justify-end border-t pt-3 border-gray-100 dark:border-gray-800">
        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(invoice)}
            className="flex-row items-center bg-accent/10 px-3.5 py-2 rounded-xl active:opacity-90"
          >
            <Ionicons name="trash-outline" size={14} color="#FF6B35" className="mr-1.5" />
            <Text className="text-accent font-bold text-[11px]">Delete</Text>
          </TouchableOpacity>
        )}

        {onSendSimulated && invoice.status !== 'paid' && (
          <TouchableOpacity
            onPress={() => onSendSimulated(invoice)}
            style={{ backgroundColor: `${colors.border}` }}
            className="flex-row items-center px-3.5 py-2 rounded-xl active:opacity-90"
          >
            <Ionicons name="paper-plane-outline" size={14} color={colors.text} className="mr-1.5" />
            <Text style={{ color: colors.text }} className="text-[11px] font-bold">Email Reminder</Text>
          </TouchableOpacity>
        )}
        
        {onEdit && (
          <TouchableOpacity
            onPress={() => onEdit(invoice)}
            style={{ backgroundColor: `${colors.border}` }}
            className="flex-row items-center px-3 py-2 rounded-xl active:opacity-90"
          >
            <Ionicons name="create-outline" size={14} color={colors.text} className="mr-1.5" />
            <Text style={{ color: colors.text }} className="text-[11px] font-bold">Edit</Text>
          </TouchableOpacity>
        )}

        {onWhatsApp && (
          <TouchableOpacity
            onPress={() => onWhatsApp(invoice)}
            className="flex-row items-center bg-emerald-500/10 px-3 py-2 rounded-xl active:opacity-90"
          >
            <Ionicons name="logo-whatsapp" size={14} color="#10B981" className="mr-1.5" />
            <Text className="text-emerald-500 font-bold text-[11px]">WhatsApp</Text>
          </TouchableOpacity>
        )}

        {onPrint && (
          <TouchableOpacity
            onPress={() => onPrint(invoice)}
            className="flex-row items-center bg-primary/10 px-3.5 py-2 rounded-xl active:opacity-90"
          >
            <Ionicons name="print-outline" size={14} color="#6C47FF" className="mr-1.5" />
            <Text className="text-primary font-bold text-[11px]">Print / Share PDF</Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};
export default InvoiceCard;
