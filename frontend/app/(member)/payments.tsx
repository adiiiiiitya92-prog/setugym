import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { InvoiceCard } from '../../components/InvoiceCard';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../hooks/useToast';
import { generateInvoicePDF } from '../../utils/invoiceGenerator';
import { Invoice } from '../../types';
import { formatCurrency } from '../../utils/currencyHelper';

export default function MemberPaymentsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { invoices, gyms } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';
  const memberId = user?.id || 'member-john';

  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch member invoices
  const ownInvoices = useMemo(() => {
    return invoices.filter(i => i.memberId === memberId);
  }, [invoices, memberId]);

  // 2. Fetch outstanding balance dues grouped by currency
  const outstandingBalanceByCurrency = useMemo(() => {
    const aggregates: Record<string, number> = {};
    ownInvoices.forEach(inv => {
      const c = inv.currency || 'USD';
      let due = 0;
      if (inv.hasInstallments) {
        if (inv.firstInstallmentStatus === 'pending') due += inv.firstInstallmentAmount || 0;
        if (inv.secondInstallmentStatus === 'pending') due += inv.secondInstallmentAmount || 0;
      } else {
        if (inv.status !== 'paid') due += inv.total;
      }
      if (due > 0) {
        aggregates[c] = (aggregates[c] || 0) + due;
      }
    });
    return aggregates;
  }, [ownInvoices]);

  const outstandingBalanceFormatted = useMemo(() => {
    const keys = Object.keys(outstandingBalanceByCurrency);
    if (keys.length === 0) return "₹0.00";
    return keys.map(k => formatCurrency(outstandingBalanceByCurrency[k], k)).join(' + ');
  }, [outstandingBalanceByCurrency]);

  const hasOutstanding = useMemo(() => {
    return Object.keys(outstandingBalanceByCurrency).length > 0;
  }, [outstandingBalanceByCurrency]);

  const handlePrint = async (invoice: Invoice) => {
    const gym = gyms.find(g => g.id === activeGymId);
    if (!gym) return;

    toast.info("Generating invoice PDF document...");
    const result = await generateInvoicePDF(invoice, gym);
    if (result.success) {
      toast.success("PDF document compiled successfully!");
    } else {
      toast.error(result.error || "Failed to generate invoice file.");
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      <View className="mb-6 mt-1">
        <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
          TRANSACTION RECORDS
        </Text>
        <Text style={{ color: colors.text }} className="text-2xl font-black tracking-tight mt-1">
          Payments & Dues
        </Text>
      </View>

      {/* Outstanding dues card */}
      <Card 
        style={{ borderColor: hasOutstanding ? '#FF6B35' : colors.border, borderWidth: hasOutstanding ? 2 : 1 }}
        className="mb-6 p-5"
      >
        <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Outstanding Balance Due</Text>
        <Text 
          style={{ color: hasOutstanding ? '#FF6B35' : '#00C896' }} 
          className="text-3xl font-black mt-1"
        >
          {outstandingBalanceFormatted}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-1.5 font-semibold">
          {hasOutstanding ? "Please settle outstanding balances at your gym's front desk." : "Your billing invoices are fully cleared!"}
        </Text>
      </Card>

      <Text style={{ color: colors.text }} className="text-lg font-black mb-3">Billing History ({ownInvoices.length})</Text>

      <FlatList
        data={ownInvoices}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            onPrint={handlePrint}
          />
        )}
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">🧾</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Invoices Listed</Text>
          </Card>
        }
      />
    </View>
  );
}
