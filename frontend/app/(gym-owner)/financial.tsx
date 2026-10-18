import React, { useState, useContext, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Dimensions, Modal, Alert, Linking } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { InvoiceCard } from '../../components/InvoiceCard';
import { PaymentReminderCard } from '../../components/PaymentReminderCard';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from 'react-native-chart-kit';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { formatDate } from '../../utils/dateHelper';
import { generateInvoicePDF } from '../../utils/invoiceGenerator';
import { Invoice, Member, MemberPlan } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, getCurrencySymbol } from '../../utils/currencyHelper';
import { format, addDays, parseISO } from 'date-fns';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { calculateMembershipBalance } from '../../utils/membershipBalance';

export default function FinancialScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { invoices, members, gyms, memberPlans, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  // Sub-tabs: invoices | reminders | chart
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'reminders' | 'chart'>('invoices');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [analyticsCurrency, setAnalyticsCurrency] = useState<'INR' | 'USD'>('INR');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Billing History Modal States
  const [billingHistoryModalVisible, setBillingHistoryModalVisible] = useState(false);
  const [selectedHistoryMemberId, setSelectedHistoryMemberId] = useState('');

  // Create Invoice Modal Form States
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [invoiceDueDate, setInvoiceDueDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [hasInstallments, setHasInstallments] = useState(false);
  const [firstInstallmentAmt, setFirstInstallmentAmt] = useState('');
  const [firstInstallmentStatus, setFirstInstallmentStatus] = useState<'paid' | 'pending'>('pending');
  const [secondInstallmentAmt, setSecondInstallmentAmt] = useState('');
  const [secondInstallmentStatus, setSecondInstallmentStatus] = useState<'paid' | 'pending'>('pending');
  const [secondInstallmentDueDate, setSecondInstallmentDueDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [customPlanName, setCustomPlanName] = useState('');
  const [customSubtotal, setCustomSubtotal] = useState('');
  const [customAddOns, setCustomAddOns] = useState('0');
  const [customCurrency, setCustomCurrency] = useState<'USD' | 'INR' | 'EUR' | 'GBP'>('INR');
  const [statusChoice, setStatusChoice] = useState<'paid' | 'pending' | 'overdue' | 'failed'>('pending');

  // Edit Invoice Modal Form States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editInvoiceNo, setEditInvoiceNo] = useState('');
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editInvoiceDueDate, setEditInvoiceDueDate] = useState('');
  const [editHasInstallments, setEditHasInstallments] = useState(false);
  const [editFirstInstallmentAmt, setEditFirstInstallmentAmt] = useState('');
  const [editFirstInstallmentStatus, setEditFirstInstallmentStatus] = useState<'paid' | 'pending'>('pending');
  const [editSecondInstallmentAmt, setEditSecondInstallmentAmt] = useState('');
  const [editSecondInstallmentStatus, setEditSecondInstallmentStatus] = useState<'paid' | 'pending'>('pending');
  const [editSecondInstallmentDueDate, setEditSecondInstallmentDueDate] = useState('');
  const [editPlanName, setEditPlanName] = useState('');
  const [editSubtotal, setEditSubtotal] = useState('');
  const [editAddOns, setEditAddOns] = useState('0');
  const [editCurrency, setEditCurrency] = useState<'USD' | 'INR' | 'EUR' | 'GBP'>('INR');
  const [editStatusChoice, setEditStatusChoice] = useState<'paid' | 'pending' | 'overdue' | 'failed'>('pending');

  // Selector sheets visibility
  const [memberSelectorVisible, setMemberSelectorVisible] = useState(false);
  const [planSelectorVisible, setPlanSelectorVisible] = useState(false);

  // Active gym members and plans
  const gymMembers = useMemo(() => members.filter(m => m.gymId === activeGymId), [members, activeGymId]);
  const gymPlans = useMemo(() => memberPlans.filter(p => p.gymId === activeGymId), [memberPlans, activeGymId]);

  // 1. Filter gym invoices
  const gymInvoices = useMemo(() => invoices.filter(i => i.gymId === activeGymId), [invoices, activeGymId]);

  // 2. Filter outstanding reminders (unpaid/pending/overdue)
  const outstandingInvoices = useMemo(() => {
    return gymInvoices.filter(i => {
      if (i.hasInstallments) {
        return i.firstInstallmentStatus === 'pending' || i.secondInstallmentStatus === 'pending';
      }
      return i.status !== 'paid';
    });
  }, [gymInvoices]);

  // 3. Group invoices by member
  const groupedMemberBilling = useMemo(() => {
    const groups: Record<string, { member: Member; invoices: Invoice[]; totalBilled: number; totalPaid: number; totalDues: number }> = {};
    
    gymInvoices.forEach(inv => {
      const mId = inv.memberId;
      let group = groups[mId];
      if (!group) {
        const member = members.find(m => m.id === mId) || {
          id: mId,
          name: inv.memberName,
          email: '',
          phone: '',
          dob: '',
          planId: '',
          startDate: '',
          endDate: '',
          status: 'inactive',
          gymId: activeGymId,
          bodyStatsLog: [],
          progressPhotos: []
        } as Member;
        
        groups[mId] = {
          member,
          invoices: [],
          totalBilled: 0,
          totalPaid: 0,
          totalDues: 0
        };
        group = groups[mId];
      }
      
      group.invoices.push(inv);
      group.totalBilled += inv.total;
      
      if (inv.hasInstallments) {
        if (inv.firstInstallmentStatus === 'paid') {
          group.totalPaid += inv.firstInstallmentAmount || 0;
        } else {
          group.totalDues += inv.firstInstallmentAmount || 0;
        }
        
        if (inv.secondInstallmentStatus === 'paid') {
          group.totalPaid += inv.secondInstallmentAmount || 0;
        } else {
          group.totalDues += inv.secondInstallmentAmount || 0;
        }
      } else {
        if (inv.status === 'paid') {
          group.totalPaid += inv.total;
        } else {
          group.totalDues += inv.total;
        }
      }
    });

    return Object.values(groups);
  }, [gymInvoices, members, activeGymId]);

  // Real-time calculation of plan payments progress inside modal
  const selectedMemberProgress = useMemo(() => {
    if (!selectedMemberId) {
      return { planPrice: 0, totalBilled: 0, totalPaid: 0, remaining: 0, outstanding: 0, currency: 'INR', isFullyPaid: false };
    }
    
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) {
      return { planPrice: 0, totalBilled: 0, totalPaid: 0, remaining: 0, outstanding: 0, currency: 'INR', isFullyPaid: false };
    }

    const balance = calculateMembershipBalance(member, invoices, memberPlans);
    const memberInvoices = invoices.filter(i => i.memberId === selectedMemberId && i.date.slice(0, 10) >= member.startDate.slice(0, 10));
    
    let totalBilled = 0;
    
    memberInvoices.forEach(inv => {
      totalBilled += inv.total;
    });
    
    return {
      planPrice: balance.membershipAmount,
      totalBilled,
      totalPaid: balance.totalPaid,
      remaining: balance.remainingBalance,
      outstanding: balance.remainingBalance,
      currency: balance.currency,
      isFullyPaid: balance.isFullyPaid
    };
  }, [selectedMemberId, members, memberPlans, invoices]);

  // Auto-calculate and pre-fill details when member changes
  useEffect(() => {
    if (selectedMemberId && createModalVisible) {
      const member = members.find(m => m.id === selectedMemberId);
      if (!member) return;
      
      const balance = calculateMembershipBalance(member, invoices, memberPlans);
      if (balance.remainingBalance > 0) {
        setCustomSubtotal(balance.remainingBalance.toFixed(2));
      } else {
        setCustomSubtotal('0');
      }
      setCustomCurrency(balance.currency as any);
      setCustomPlanName(balance.plan?.name || '');
    }
  }, [selectedMemberId, createModalVisible, members, memberPlans, invoices]);

  // Search query filters for grouped billing profiles and reminders
  const searchedGroupedBilling = useMemo(() => {
    if (!searchQuery) return groupedMemberBilling;
    return groupedMemberBilling.filter(g => g.member.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [groupedMemberBilling, searchQuery]);

  const searchedReminders = useSearch(outstandingInvoices, searchQuery, ['memberName', 'invoiceNo']);

  // Financial aggregates grouped by currency
  const aggregatesByCurrency = useMemo(() => {
    const aggregates: Record<string, { collected: number; dues: number; secondInstallmentPending: number }> = {};
    gymInvoices.forEach(inv => {
      const curr = inv.currency || 'USD';
      if (!aggregates[curr]) {
        aggregates[curr] = { collected: 0, dues: 0, secondInstallmentPending: 0 };
      }
      
      if (inv.hasInstallments) {
        if (inv.firstInstallmentStatus === 'paid') {
          aggregates[curr].collected += inv.firstInstallmentAmount || 0;
        } else {
          aggregates[curr].dues += inv.firstInstallmentAmount || 0;
        }
        
        if (inv.secondInstallmentStatus === 'paid') {
          aggregates[curr].collected += inv.secondInstallmentAmount || 0;
        } else {
          aggregates[curr].dues += inv.secondInstallmentAmount || 0;
          aggregates[curr].secondInstallmentPending += inv.secondInstallmentAmount || 0;
        }
      } else {
        if (inv.status === 'paid') {
          aggregates[curr].collected += inv.total;
        } else {
          aggregates[curr].dues += inv.total;
        }
      }
    });
    return aggregates;
  }, [gymInvoices]);

  // Trigger PDF printing/sharing
  const handlePrintInvoice = async (invoice: Invoice) => {
    const gym = gyms.find(g => g.id === activeGymId);
    if (!gym) return;
    
    const member = members.find(m => m.id === invoice.memberId);
    toast.info("Generating invoice PDF document...");
    const result = await generateInvoicePDF(invoice, gym, member);
    if (result.success) {
      toast.success("Invoice PDF generated successfully!");
    } else {
      toast.error(result.error || "Failed to compile document.");
    }
  };

  // Helper function to build PDF invoice and share it directly (same as super admin panel)
  const handleSendInvoiceWhatsApp = async (invoice: Invoice) => {
    const gym = gyms.find(g => g.id === activeGymId) || gyms[0];
    if (!gym) {
      toast.error("Gym settings not found.");
      return;
    }
    const member = members.find(m => m.id === invoice.memberId);
    toast.info("Generating invoice PDF...");
    const res = await generateInvoicePDF(invoice, gym, member);
    if (!res.success) {
      toast.error(res.error || "Failed to generate PDF.");
    }
  };

  const handleSendSimulatedReminder = (invoice: Invoice) => {
    toast.success(`Sent automated payment reminder email to ${invoice.memberName}!`);
  };

  const handleSendReminderAlert = (member: Member, invoice: Invoice) => {
    let amountText = formatCurrency(invoice.total, invoice.currency);
    if (invoice.hasInstallments) {
      if (invoice.firstInstallmentStatus === 'pending' && invoice.secondInstallmentStatus === 'pending') {
        amountText = `${formatCurrency(invoice.total, invoice.currency)} (Both Installments)`;
      } else if (invoice.secondInstallmentStatus === 'pending') {
        amountText = `${formatCurrency(invoice.secondInstallmentAmount || 0, invoice.currency)} (2nd Installment)`;
      } else {
        amountText = `${formatCurrency(invoice.firstInstallmentAmount || 0, invoice.currency)} (1st Installment)`;
      }
    }
    toast.success(`Alerted ${member.name} about outstanding dues of ${amountText}.`);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete invoice ${invoice.invoiceNo}? This action will permanently remove the record and update the member's remaining dues.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            dispatch({ type: 'DELETE_INVOICE', payload: invoice.id });
            toast.error(`Invoice ${invoice.invoiceNo} has been deleted.`);
          }
        }
      ]
    );
  };

  // Bulk alerts triggers
  const handleBulkReminders = () => {
    if (outstandingInvoices.length === 0) {
      toast.info("All member invoices are fully settled!");
      return;
    }
    toast.success(`Sent bulk billing alerts to all ${outstandingInvoices.length} members with unpaid balances.`);
  };

  const handleOpenBillingHistory = (memberId: string) => {
    setSelectedHistoryMemberId(memberId);
    setBillingHistoryModalVisible(true);
  };

  const handleOpenCreateInvoice = () => {
    const firstMember = gymMembers.find(member => {
      return !calculateMembershipBalance(member, invoices, memberPlans).isFullyPaid;
    })?.id || gymMembers[0]?.id || '';
    const firstMemberRecord = members.find(m => m.id === firstMember);
    if (firstMemberRecord && calculateMembershipBalance(firstMemberRecord, invoices, memberPlans).isFullyPaid) {
      toast.warning("Membership payment completed. Please renew the membership plan to create a new invoice.");
      return;
    }
    setSelectedMemberId(firstMember);
    
    const defaultMember = members.find(m => m.id === firstMember);
    const defaultPlan = memberPlans.find(p => p.id === defaultMember?.planId) || gymPlans[0];
    const defaultBalance = defaultMember ? calculateMembershipBalance(defaultMember, invoices, memberPlans) : null;
    setSelectedPlanId(defaultPlan?.id || '');
    setCustomPlanName(defaultPlan?.name || '');
    setCustomSubtotal(defaultBalance ? defaultBalance.remainingBalance.toString() : '0');
    setCustomAddOns('0');
    setCustomCurrency(defaultPlan?.currency || 'INR');
    
    setInvoiceNo(`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setInvoiceDate(format(new Date(), "yyyy-MM-dd"));
    setInvoiceDueDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    
    setHasInstallments(false);
    setFirstInstallmentAmt('');
    setFirstInstallmentStatus('pending');
    setSecondInstallmentAmt('');
    setSecondInstallmentStatus('pending');
    setSecondInstallmentDueDate(format(addDays(new Date(), 30), "yyyy-MM-dd"));
    
    setStatusChoice('paid');
    setCreateModalVisible(true);
  };

  // Triggered inside billing history to issue invoice for that person
  const handleOpenCreateInvoiceForMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member && calculateMembershipBalance(member, invoices, memberPlans).isFullyPaid) {
      toast.warning("Membership payment completed. Please renew the membership plan to create a new invoice.");
      return;
    }
    setSelectedMemberId(memberId);
    setStatusChoice('paid');
    setCreateModalVisible(true);
  };

  const handleOpenEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditInvoiceNo(invoice.invoiceNo);
    setEditInvoiceDate(invoice.date);
    setEditInvoiceDueDate(invoice.dueDate);
    setEditHasInstallments(!!invoice.hasInstallments);
    setEditFirstInstallmentAmt(invoice.firstInstallmentAmount?.toString() || '');
    setEditFirstInstallmentStatus(invoice.firstInstallmentStatus || 'pending');
    setEditSecondInstallmentAmt(invoice.secondInstallmentAmount?.toString() || '');
    setEditSecondInstallmentStatus(invoice.secondInstallmentStatus || 'pending');
    setEditSecondInstallmentDueDate(invoice.secondInstallmentDueDate || '');
    setEditPlanName(invoice.planName);
    setEditSubtotal(invoice.subtotal.toString());
    setEditAddOns(invoice.addOns.toString());
    setEditCurrency(invoice.currency || 'INR');
    setEditStatusChoice(invoice.status);
    setEditModalVisible(true);
  };

  const handleSelectPlan = (plan: MemberPlan) => {
    setSelectedPlanId(plan.id);
    setCustomPlanName(plan.name);
    setCustomSubtotal(selectedMemberProgress.remaining > 0 ? selectedMemberProgress.remaining.toString() : '0');
    setCustomCurrency(plan.currency || 'INR');
    setPlanSelectorVisible(false);
    
    const totalVal = plan.price * 1.18;
    setFirstInstallmentAmt((totalVal / 2).toFixed(2));
    setSecondInstallmentAmt((totalVal / 2).toFixed(2));
  };

  const handleToggleInstallments = (val: boolean) => {
    setHasInstallments(val);
    if (val) {
      const subtotalVal = Number(customSubtotal) || 0;
      const taxVal = subtotalVal * 0.18;
      const addOnsVal = Number(customAddOns) || 0;
      const totalVal = subtotalVal + taxVal + addOnsVal;
      setFirstInstallmentAmt((totalVal / 2).toFixed(2));
      setSecondInstallmentAmt((totalVal / 2).toFixed(2));
    }
  };

  const handleToggleEditInstallments = (val: boolean) => {
    setEditHasInstallments(val);
    if (val) {
      const subtotalVal = Number(editSubtotal) || 0;
      const taxVal = subtotalVal * 0.18;
      const addOnsVal = Number(editAddOns) || 0;
      const totalVal = subtotalVal + taxVal + addOnsVal;
      setEditFirstInstallmentAmt((totalVal / 2).toFixed(2));
      setEditSecondInstallmentAmt((totalVal / 2).toFixed(2));
    }
  };

  const handleCreateInvoice = () => {
    if (!selectedMemberId) {
      toast.error("Please select a gym member.");
      return;
    }
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    const subtotalVal = Number(customSubtotal) || 0;
    const addOnsVal = Number(customAddOns) || 0;
    const taxVal = 0;
    const totalVal = subtotalVal + addOnsVal;
    const balance = calculateMembershipBalance(member, invoices, memberPlans);

    if (balance.isFullyPaid) {
      toast.warning("Membership payment completed. Please renew the membership plan to create a new invoice.");
      return;
    }

    if (totalVal <= 0) {
      toast.error("Please enter an invoice amount.");
      return;
    }

    if (totalVal > balance.remainingBalance) {
      toast.error("Invoice amount cannot exceed the remaining membership balance.");
      return;
    }

    let firstAmt = Number(firstInstallmentAmt) || totalVal / 2;
    let secondAmt = Number(secondInstallmentAmt) || totalVal / 2;

    let overallStatus: 'paid' | 'pending' | 'overdue' | 'failed' = statusChoice;
    if (hasInstallments) {
      if (firstInstallmentStatus === 'paid' && secondInstallmentStatus === 'paid') {
        overallStatus = 'paid';
      } else {
        overallStatus = 'pending';
      }
    }

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: invoiceNo || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      memberId: member.id,
      memberName: member.name,
      planName: customPlanName || "Custom Package",
      amount: totalVal,
      date: invoiceDate,
      dueDate: invoiceDueDate,
      status: overallStatus,
      subtotal: subtotalVal,
      tax: taxVal,
      addOns: addOnsVal,
      total: totalVal,
      paidAmount: hasInstallments ? undefined : (overallStatus === 'paid' ? totalVal : 0),
      dueAmount: hasInstallments ? undefined : (overallStatus === 'paid' ? 0 : totalVal),
      gymId: activeGymId,
      currency: customCurrency,
      hasInstallments,
      firstInstallmentAmount: hasInstallments ? firstAmt : undefined,
      firstInstallmentStatus: hasInstallments ? firstInstallmentStatus : undefined,
      secondInstallmentAmount: hasInstallments ? secondAmt : undefined,
      secondInstallmentStatus: hasInstallments ? secondInstallmentStatus : undefined,
      secondInstallmentDueDate: hasInstallments ? secondInstallmentDueDate : undefined
    };

    dispatch({ type: 'ADD_INVOICE', payload: newInvoice });
    toast.success(`Invoice ${newInvoice.invoiceNo} issued successfully!`);
    setCreateModalVisible(false);
  };

  const handleSaveEditInvoice = () => {
    if (!editingInvoice) return;

    const subtotalVal = Number(editSubtotal) || 0;
    const taxVal = subtotalVal * 0.18;
    const addOnsVal = Number(editAddOns) || 0;
    const totalVal = subtotalVal + taxVal + addOnsVal;

    let firstAmt = Number(editFirstInstallmentAmt) || totalVal / 2;
    let secondAmt = Number(editSecondInstallmentAmt) || totalVal / 2;

    let overallStatus: 'paid' | 'pending' | 'overdue' | 'failed' = editStatusChoice;
    if (editHasInstallments) {
      if (editFirstInstallmentStatus === 'paid' && editSecondInstallmentStatus === 'paid') {
        overallStatus = 'paid';
      } else {
        overallStatus = 'pending';
      }
    }

    const updatedInvoice: Invoice = {
      ...editingInvoice,
      invoiceNo: editInvoiceNo,
      planName: editPlanName,
      amount: totalVal,
      date: editInvoiceDate,
      dueDate: editInvoiceDueDate,
      status: overallStatus,
      subtotal: subtotalVal,
      tax: taxVal,
      addOns: addOnsVal,
      total: totalVal,
      paidAmount: editHasInstallments ? undefined : (overallStatus === 'paid' ? totalVal : 0),
      dueAmount: editHasInstallments ? undefined : (overallStatus === 'paid' ? 0 : totalVal),
      currency: editCurrency,
      hasInstallments: editHasInstallments,
      firstInstallmentAmount: editHasInstallments ? firstAmt : undefined,
      firstInstallmentStatus: editHasInstallments ? editFirstInstallmentStatus : undefined,
      secondInstallmentAmount: editHasInstallments ? secondAmt : undefined,
      secondInstallmentStatus: editHasInstallments ? editSecondInstallmentStatus : undefined,
      secondInstallmentDueDate: editHasInstallments ? editSecondInstallmentDueDate : undefined
    };

    dispatch({ type: 'UPDATE_INVOICE', payload: updatedInvoice });
    toast.success(`Invoice ${updatedInvoice.invoiceNo} updated successfully!`);
    setEditModalVisible(false);
  };

  const screenWidth = Dimensions.get('window').width;

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(108, 71, 255, ${opacity})`,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  const getInvoicePaymentStats = (inv: Invoice) => {
    let paid = 0;
    let due = 0;
    if (inv.hasInstallments) {
      if (inv.firstInstallmentStatus === 'paid') {
        paid += inv.firstInstallmentAmount || 0;
      } else {
        due += inv.firstInstallmentAmount || 0;
      }
      if (inv.secondInstallmentStatus === 'paid') {
        paid += inv.secondInstallmentAmount || 0;
      } else {
        due += inv.secondInstallmentAmount || 0;
      }
    } else {
      if (inv.status === 'paid') {
        paid += inv.total;
      } else {
        due += inv.total;
      }
    }
    return { paid, due };
  };

  const analyticsData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === 'weekly') {
      startDate = addDays(now, -6);
    } else if (timeframe === 'monthly') {
      startDate = addDays(now, -29);
    } else if (timeframe === 'quarterly') {
      startDate = addDays(now, -89);
    } else if (timeframe === 'yearly') {
      startDate = addDays(now, -364);
    }
    
    startDate.setHours(0, 0, 0, 0);

    const periodInvoices = gymInvoices.filter(inv => {
      const c = inv.currency || 'INR';
      if (c.toUpperCase() !== analyticsCurrency.toUpperCase()) return false;
      const invDate = new Date(inv.date);
      return invDate >= startDate && invDate <= now;
    });

    let totalBilled = 0;
    let totalCollected = 0;
    let totalDues = 0;
    const uniqueMembers = new Set<string>();

    periodInvoices.forEach(inv => {
      totalBilled += inv.total;
      const { paid, due } = getInvoicePaymentStats(inv);
      totalCollected += paid;
      totalDues += due;
      if (inv.memberId) {
        uniqueMembers.add(inv.memberId);
      }
    });

    const invoiceCount = periodInvoices.length;
    const avgRevenue = uniqueMembers.size > 0 ? (totalCollected / uniqueMembers.size) : 0;

    let chartLabels: string[] = [];
    let chartValuesCollected: number[] = [];
    let chartValuesDues: number[] = [];

    if (timeframe === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        const d = addDays(now, -i);
        const label = format(d, 'E'); // Mon, Tue...
        chartLabels.push(label);
        
        let dayCollected = 0;
        let dayDues = 0;
        periodInvoices.forEach(inv => {
          const invDate = new Date(inv.date);
          if (invDate.toDateString() === d.toDateString()) {
            const { paid, due } = getInvoicePaymentStats(inv);
            dayCollected += paid;
            dayDues += due;
          }
        });
        chartValuesCollected.push(dayCollected);
        chartValuesDues.push(dayDues);
      }
    } else if (timeframe === 'monthly') {
      chartLabels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
      const weekBucketsCollected = [0, 0, 0, 0];
      const weekBucketsDues = [0, 0, 0, 0];

      periodInvoices.forEach(inv => {
        const invDate = new Date(inv.date);
        const diffTime = now.getTime() - invDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const { paid, due } = getInvoicePaymentStats(inv);
        if (diffDays < 7) {
          weekBucketsCollected[3] += paid;
          weekBucketsDues[3] += due;
        } else if (diffDays < 14) {
          weekBucketsCollected[2] += paid;
          weekBucketsDues[2] += due;
        } else if (diffDays < 21) {
          weekBucketsCollected[1] += paid;
          weekBucketsDues[1] += due;
        } else {
          weekBucketsCollected[0] += paid;
          weekBucketsDues[0] += due;
        }
      });
      chartValuesCollected = weekBucketsCollected;
      chartValuesDues = weekBucketsDues;
    } else if (timeframe === 'quarterly') {
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = format(d, 'MMM'); // Apr, May...
        chartLabels.push(label);
        
        let monthCollected = 0;
        let monthDues = 0;
        periodInvoices.forEach(inv => {
          const invDate = new Date(inv.date);
          if (invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear()) {
            const { paid, due } = getInvoicePaymentStats(inv);
            monthCollected += paid;
            monthDues += due;
          }
        });
        chartValuesCollected.push(monthCollected);
        chartValuesDues.push(monthDues);
      }
    } else if (timeframe === 'yearly') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = format(d, 'MMM');
        chartLabels.push(label);
        
        let monthCollected = 0;
        let monthDues = 0;
        periodInvoices.forEach(inv => {
          const invDate = new Date(inv.date);
          if (invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear()) {
            const { paid, due } = getInvoicePaymentStats(inv);
            monthCollected += paid;
            monthDues += due;
          }
        });
        chartValuesCollected.push(monthCollected);
        chartValuesDues.push(monthDues);
      }
    }

    return {
      totalBilled,
      totalCollected,
      totalDues,
      invoiceCount,
      avgRevenue,
      chartLabels,
      chartValuesCollected,
      chartValuesDues
    };
  }, [gymInvoices, timeframe, analyticsCurrency]);

  // Member billing history information
  const historyBillingGroup = useMemo(() => {
    return groupedMemberBilling.find(g => g.member.id === selectedHistoryMemberId);
  }, [groupedMemberBilling, selectedHistoryMemberId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      {/* Sub tabs */}
      <View className="flex-row mb-4 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
        <TouchableOpacity
          onPress={() => setActiveSubTab('invoices')}
          style={{ backgroundColor: activeSubTab === 'invoices' ? '#6C47FF' : 'transparent' }}
          className="flex-1 py-2 rounded-lg items-center"
        >
          <Text style={{ color: activeSubTab === 'invoices' ? '#FFFFFF' : colors.textSecondary }} className="text-[10px] font-extrabold uppercase tracking-wide">
            Invoices
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSubTab('reminders')}
          style={{ backgroundColor: activeSubTab === 'reminders' ? '#6C47FF' : 'transparent' }}
          className="flex-1 py-2 rounded-lg items-center"
        >
          <Text style={{ color: activeSubTab === 'reminders' ? '#FFFFFF' : colors.textSecondary }} className="text-[10px] font-extrabold uppercase tracking-wide">
            Reminders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSubTab('chart')}
          style={{ backgroundColor: activeSubTab === 'chart' ? '#6C47FF' : 'transparent' }}
          className="flex-1 py-2 rounded-lg items-center"
        >
          <Text style={{ color: activeSubTab === 'chart' ? '#FFFFFF' : colors.textSecondary }} className="text-[10px] font-extrabold uppercase tracking-wide">
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'invoices' && (
        <View style={{ flex: 1 }}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search member billing profiles..." />
          <FlatList
            data={searchedGroupedBilling}
            keyExtractor={item => item.member.id}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            renderItem={({ item }) => {
              const balance = calculateMembershipBalance(item.member, invoices, memberPlans);
              const percentage = balance.membershipAmount > 0 ? (balance.totalPaid / balance.membershipAmount) * 100 : 0;
              const primaryCurrency = balance.currency || item.invoices[0]?.currency || 'INR';
              
              return (
                <Card onPress={() => handleOpenBillingHistory(item.member.id)} className="mb-4">
                  <View className="flex-row justify-between items-start border-b pb-3 mb-3 border-gray-100 dark:border-gray-800">
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                        <Text className="text-primary font-bold text-sm">
                          {item.member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ color: colors.text }} className="text-base font-extrabold">
                          {item.member.name}
                        </Text>
                        <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">
                          {item.invoices.length} {item.invoices.length === 1 ? 'invoice' : 'invoices'}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="items-end">
                      <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Remaining Balance</Text>
                      <Text style={{ color: balance.remainingBalance > 0 ? '#FF6B35' : '#00C896' }} className="text-base font-black mt-0.5">
                        {formatCurrency(balance.remainingBalance, primaryCurrency)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between mb-2">
                    <View>
                      <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Total Billed</Text>
                      <Text style={{ color: colors.text }} className="text-sm font-bold mt-0.5">
                        {formatCurrency(item.totalBilled, primaryCurrency)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Total Paid</Text>
                      <Text style={{ color: '#00C896' }} className="text-sm font-bold mt-0.5">
                        {formatCurrency(balance.totalPaid, primaryCurrency)}
                      </Text>
                    </View>
                  </View>

                  <View className="w-full h-1.5 bg-gray-150 dark:bg-gray-800 rounded-full overflow-hidden mt-1.5">
                    <View 
                      style={{ 
                        width: `${Math.min(percentage, 100)}%`, 
                        backgroundColor: percentage >= 100 ? '#00C896' : '#6C47FF' 
                      }} 
                      className="h-full rounded-full" 
                    />
                  </View>
                </Card>
              );
            }}
            ListEmptyComponent={
              <Card className="items-center py-10">
                <Text className="text-4xl mb-3">🧾</Text>
                <Text style={{ color: colors.text }} className="text-base font-bold">No Billing Records Found</Text>
              </Card>
            }
          />
        </View>
      )}

      {activeSubTab === 'reminders' && (
        <View style={{ flex: 1 }}>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search unpaid members..." />
            </View>
            <TouchableOpacity
              onPress={handleBulkReminders}
              className="p-3 bg-accent/10 rounded-2xl mb-4 flex-row items-center"
            >
              <Ionicons name="notifications-outline" size={20} color="#FF6B35" />
              <Text className="text-accent font-bold text-xs ml-1.5 uppercase">Bulk Alert</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={searchedReminders}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const member = members.find(m => m.id === item.memberId);
              if (!member) return null;
              return (
                <PaymentReminderCard
                  member={member}
                  invoice={item}
                  onSendReminder={handleSendReminderAlert}
                />
              );
            }}
            ListEmptyComponent={
              <Card className="items-center py-10">
                <Text className="text-4xl mb-3">🎉</Text>
                <Text style={{ color: colors.text }} className="text-base font-bold">All settled!</Text>
                <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1">No outstanding dues listed.</Text>
              </Card>
            }
          />
        </View>
      )}

      {activeSubTab === 'chart' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Timeframe selector */}
          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-extrabold uppercase tracking-wider mb-2 ml-1">
            Report Period
          </Text>
          <View className="flex-row mb-4 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
            {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map((tf) => (
              <TouchableOpacity
                key={tf}
                onPress={() => setTimeframe(tf)}
                style={{ backgroundColor: timeframe === tf ? '#6C47FF' : 'transparent' }}
                className="flex-1 py-2 rounded-lg items-center justify-center"
              >
                <Text style={{ color: timeframe === tf ? '#FFFFFF' : colors.textSecondary }} className="text-[10px] font-extrabold uppercase tracking-wide">
                  {tf}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Currency selector */}
          <Text style={{ color: colors.textSecondary }} className="text-[10px] font-extrabold uppercase tracking-wider mb-2 ml-1">
            Select Currency
          </Text>
          <View className="flex-row mb-5 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
            {(['INR', 'USD'] as const).map((curr) => (
              <TouchableOpacity
                key={curr}
                onPress={() => setAnalyticsCurrency(curr)}
                style={{ backgroundColor: analyticsCurrency === curr ? '#6C47FF' : 'transparent' }}
                className="flex-1 py-2 rounded-lg items-center justify-center"
              >
                <Text style={{ color: analyticsCurrency === curr ? '#FFFFFF' : colors.textSecondary }} className="text-[10px] font-extrabold uppercase tracking-wide">
                  {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats grid */}
          <View className="flex-row flex-wrap justify-between gap-4 mb-5">
            <StatCard 
              title="Cash Collected" 
              value={formatCurrency(analyticsData.totalCollected, analyticsCurrency)} 
              icon="cash-outline" 
              color="#00C896" 
            />
            <StatCard 
              title="Outstanding Dues" 
              value={formatCurrency(analyticsData.totalDues, analyticsCurrency)} 
              icon="hourglass-outline" 
              color="#FF6B35" 
            />
            <StatCard 
              title="Total Billed" 
              value={formatCurrency(analyticsData.totalBilled, analyticsCurrency)} 
              icon="receipt-outline" 
              color="#6C47FF" 
            />
            <StatCard 
              title="Avg per Client" 
              value={formatCurrency(analyticsData.avgRevenue, analyticsCurrency)} 
              icon="people-outline" 
              color="#3B82F6" 
            />
          </View>

          {/* Earnings Trend Graphic */}
          <Text style={{ color: colors.text }} className="text-sm font-extrabold mb-3 uppercase tracking-wider text-primary ml-1">
            Earning Chart Trend ({analyticsCurrency})
          </Text>
          <Card noPadding className="p-2 items-center">
            {analyticsData.chartValuesCollected.every(v => v === 0) ? (
              <View className="py-12 items-center justify-center w-full">
                <Text className="text-4xl mb-2">📊</Text>
                <Text style={{ color: colors.textSecondary }} className="text-xs font-bold text-center">
                  No revenue data in this period and currency.
                </Text>
              </View>
            ) : (
              <BarChart
                data={{
                  labels: analyticsData.chartLabels,
                  datasets: [{ data: analyticsData.chartValuesCollected }]
                }}
                yAxisLabel={getCurrencySymbol(analyticsCurrency)}
                yAxisSuffix=""
                width={screenWidth - 48}
                height={220}
                chartConfig={chartConfig}
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            )}
          </Card>
        </ScrollView>
      )}



      {/* MEMBER BILLING HISTORY MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={billingHistoryModalVisible}
        onRequestClose={() => setBillingHistoryModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 h-[85%] border-t border-gray-100 dark:border-gray-800">
            {!historyBillingGroup ? (
              <View className="flex-1">
                <View className="flex-row justify-between items-center mb-4">
                  <View>
                    <Text style={{ color: colors.text }} className="text-xl font-black">
                      Billing Profile
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">
                      No Profile Selected
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setBillingHistoryModalVisible(false)} className="p-1">
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View className="flex-1 justify-center items-center">
                  <Text className="text-4xl mb-3">🧾</Text>
                  <Text style={{ color: colors.text }} className="text-base font-bold">No Invoices Found</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1">
                    All history records for this profile have been deleted.
                  </Text>
                </View>
              </View>
            ) : (() => {
              const memberPlan = memberPlans.find(p => p.id === historyBillingGroup.member.planId);
              const balance = calculateMembershipBalance(historyBillingGroup.member, invoices, memberPlans);
              const planTotal = balance.membershipAmount || historyBillingGroup.totalBilled;
              const planCurrency = memberPlan?.currency || balance.currency || historyBillingGroup.invoices[0]?.currency || 'INR';
              const remainingDues = balance.remainingBalance;

              return (
                <View className="flex-1">
                  <View className="flex-row justify-between items-center mb-4">
                    <View>
                      <Text style={{ color: colors.text }} className="text-xl font-black">
                        Billing Profile
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-0.5">
                        {historyBillingGroup.member.name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setBillingHistoryModalVisible(false)} className="p-1">
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Metrics header */}
                  <View className="flex-row justify-between gap-3 mb-4 bg-gray-50 dark:bg-gray-800/20 p-3 rounded-2xl">
                    <View className="items-center flex-1">
                      <Text style={{ color: colors.textSecondary }} className="text-[9px] font-black uppercase">Plan Total</Text>
                      <Text style={{ color: colors.text }} className="text-sm font-black mt-0.5">
                        {formatCurrency(planTotal, planCurrency)}
                      </Text>
                    </View>
                    <View className="items-center flex-1 border-x border-gray-100 dark:border-gray-800">
                      <Text style={{ color: colors.textSecondary }} className="text-[9px] font-black uppercase">Paid</Text>
                      <Text style={{ color: '#00C896' }} className="text-sm font-black mt-0.5">
                        {formatCurrency(historyBillingGroup.totalPaid, planCurrency)}
                      </Text>
                    </View>
                    <View className="items-center flex-1">
                      <Text style={{ color: colors.textSecondary }} className="text-[9px] font-black uppercase">Remaining Dues</Text>
                      <Text style={{ color: remainingDues > 0 ? '#FF6B35' : '#00C896' }} className="text-sm font-black mt-0.5">
                        {formatCurrency(remainingDues, planCurrency)}
                      </Text>
                    </View>
                  </View>



                  <Text style={{ color: colors.text }} className="text-sm font-black mb-3">Invoice Receipts history</Text>

                  <FlatList
                    data={historyBillingGroup.invoices}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <InvoiceCard
                        invoice={item}
                        onPrint={handlePrintInvoice}
                        onSendSimulated={handleSendSimulatedReminder}
                        onEdit={(inv) => {
                          setBillingHistoryModalVisible(false);
                          handleOpenEditInvoice(inv);
                        }}
                        onDelete={handleDeleteInvoice}
                        onWhatsApp={handleSendInvoiceWhatsApp}
                      />
                    )}
                  />
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* CREATE INVOICE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Issue Billing Invoice
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Select Gym Member</Text>
              <TouchableOpacity
                onPress={() => setMemberSelectorVisible(true)}
                className="p-3.5 border rounded-xl flex-row justify-between items-center mb-4 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/10"
              >
                <Text style={{ color: colors.text }} className="text-xs font-semibold">
                  {members.find(m => m.id === selectedMemberId)?.name || "Choose Member..."}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Real-time Payment Calculations Progress */}
              {selectedMemberId ? (
                <View className="mb-4 p-3.5 bg-gray-50 dark:bg-gray-850 p-3 rounded-2xl border border-gray-150 dark:border-gray-800">
                  <View className="flex-row justify-between items-center mb-2.5">
                    <Text style={{ color: colors.text }} className="text-[10px] font-black uppercase tracking-wider text-primary">Membership Fees Progress</Text>
                    {selectedMemberProgress.isFullyPaid && (
                      <View className="bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        <Text className="text-emerald-500 text-[8px] font-black uppercase">Fully Paid</Text>
                      </View>
                    )}
                  </View>
                  
                  <View className="flex-row justify-between mb-1.5">
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Plan Target price</Text>
                    <Text style={{ color: colors.text }} className="text-[10px] font-bold text-right">
                      {formatCurrency(selectedMemberProgress.planPrice, selectedMemberProgress.currency)}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between mb-1.5">
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Paid so far</Text>
                    <Text style={{ color: '#00C896' }} className="text-[10px] font-bold text-right">
                      {formatCurrency(selectedMemberProgress.totalPaid, selectedMemberProgress.currency)}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between mb-1.5">
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Remaining Balance</Text>
                    <Text style={{ color: '#FF6B35' }} className="text-[10px] font-bold text-right">
                      {formatCurrency(selectedMemberProgress.remaining, selectedMemberProgress.currency)}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold">Maximum Invoice Amount</Text>
                    <Text style={{ color: '#FF6B35' }} className="text-[10px] font-bold text-right">
                      {formatCurrency(selectedMemberProgress.outstanding, selectedMemberProgress.currency)}
                    </Text>
                  </View>

                  {selectedMemberProgress.remaining > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setCustomSubtotal(selectedMemberProgress.remaining.toFixed(2));
                        setCustomCurrency(selectedMemberProgress.currency as any);
                        toast.success("Pre-filled subtotal with remaining balance!");
                      }}
                      className="mt-2.5 bg-primary/10 py-1.5 rounded-lg items-center justify-center active:opacity-90"
                    >
                      <Text className="text-primary font-bold text-[9px] uppercase tracking-wider">Use Remaining: {formatCurrency(selectedMemberProgress.remaining, selectedMemberProgress.currency)}</Text>
                    </TouchableOpacity>
                  )}
                  {selectedMemberProgress.isFullyPaid && (
                    <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-2">
                      Membership payment completed. Please renew the membership plan to create a new invoice.
                    </Text>
                  )}
                </View>
              ) : null}

              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Select Membership Plan (Pre-fills values)</Text>
              <TouchableOpacity
                onPress={() => setPlanSelectorVisible(true)}
                className="p-3.5 border rounded-xl flex-row justify-between items-center mb-4 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/10"
              >
                <Text style={{ color: colors.text }} className="text-xs font-semibold">
                  {gymPlans.find(p => p.id === selectedPlanId)?.name || "Choose Membership Plan..."}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <Input
                label="Invoice Number"
                placeholder="e.g. INV-2026-1032"
                value={invoiceNo}
                onChangeText={setInvoiceNo}
                icon="receipt-outline"
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    label="Issue Date"
                    placeholder="YYYY-MM-DD"
                    value={invoiceDate}
                    onChangeText={setInvoiceDate}
                    icon="calendar-outline"
                    isDatePicker={true}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Due Date"
                    placeholder="YYYY-MM-DD"
                    value={invoiceDueDate}
                    onChangeText={setInvoiceDueDate}
                    icon="hourglass-outline"
                    isDatePicker={true}
                  />
                </View>
              </View>

              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Override Billing Currency</Text>
              <View className="flex-row gap-2 mb-4">
                {(['INR', 'USD', 'EUR', 'GBP'] as const).map((curr) => {
                  const isSelected = customCurrency === curr;
                  const label = curr === 'INR' ? 'Rupees (₹)' : curr === 'USD' ? 'USD ($)' : curr === 'EUR' ? 'EUR (€)' : 'GBP (£)';
                  return (
                    <TouchableOpacity
                      key={curr}
                      onPress={() => setCustomCurrency(curr)}
                      style={{
                        borderColor: isSelected ? '#6C47FF' : colors.border,
                        backgroundColor: isSelected ? 'rgba(108,71,255,0.08)' : 'transparent',
                        borderWidth: 1.5
                      }}
                      className="px-2.5 py-1.5 rounded-xl flex-1 items-center justify-center"
                    >
                      <Text style={{ color: isSelected ? '#6C47FF' : colors.text }} className="text-[9px] font-extrabold">
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Input
                label={`Invoice Amount (${customCurrency})`}
                placeholder="e.g. 1500"
                value={customSubtotal}
                onChangeText={setCustomSubtotal}
                keyboardType="numeric"
                icon="cash-outline"
              />

              <Input
                label={`Custom Add-Ons (${customCurrency})`}
                placeholder="e.g. 200"
                value={customAddOns}
                onChangeText={setCustomAddOns}
                keyboardType="numeric"
                icon="shirt-outline"
              />

              <View className="flex-row items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/30 rounded-xl mb-4">
                <View>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">Two-Installment Billing</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-0.5">Divide payment into 1st & 2nd installment logs</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleToggleInstallments(!hasInstallments)}
                  className={`w-12 h-6 rounded-full px-1 justify-center ${hasInstallments ? 'bg-primary items-end' : 'bg-gray-300 dark:bg-gray-700 items-start'}`}
                >
                  <View className="w-4.5 h-4.5 bg-white rounded-full" />
                </TouchableOpacity>
              </View>

              {hasInstallments && (
                <View className="p-3 bg-gray-50 dark:bg-gray-800/10 rounded-xl mb-4 border border-dashed border-gray-200 dark:border-gray-800">
                  <Text style={{ color: colors.text }} className="text-xs font-black mb-3">Installment Settings</Text>
                  
                  <View className="flex-row gap-3 mb-2">
                    <View className="flex-1">
                      <Input
                        label="1st Installment Amt"
                        value={firstInstallmentAmt}
                        onChangeText={setFirstInstallmentAmt}
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mb-1 ml-0.5">1st Installment Status</Text>
                      <View className="flex-row gap-1 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-xl">
                        {(['paid', 'pending'] as const).map((s) => {
                          const active = firstInstallmentStatus === s;
                          return (
                            <TouchableOpacity
                              key={s}
                              onPress={() => setFirstInstallmentStatus(s)}
                              style={{ backgroundColor: active ? '#6C47FF' : 'transparent' }}
                              className="flex-1 py-1.5 rounded-lg items-center"
                            >
                              <Text style={{ color: active ? '#FFFFFF' : colors.textSecondary }} className="text-[9px] font-bold uppercase">{s}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Input
                        label="2nd Installment Amt"
                        value={secondInstallmentAmt}
                        onChangeText={setSecondInstallmentAmt}
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mb-1 ml-0.5">2nd Installment Status</Text>
                      <View className="flex-row gap-1 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-xl">
                        {(['paid', 'pending'] as const).map((s) => {
                          const active = secondInstallmentStatus === s;
                          return (
                            <TouchableOpacity
                              key={s}
                              onPress={() => setSecondInstallmentStatus(s)}
                              style={{ backgroundColor: active ? '#6C47FF' : 'transparent' }}
                              className="flex-1 py-1.5 rounded-lg items-center"
                            >
                              <Text style={{ color: active ? '#FFFFFF' : colors.textSecondary }} className="text-[9px] font-bold uppercase">{s}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  <View className="mt-3">
                    <Input
                      label="2nd Installment Due Date"
                      placeholder="YYYY-MM-DD"
                      value={secondInstallmentDueDate}
                      onChangeText={setSecondInstallmentDueDate}
                      icon="time-outline"
                      isDatePicker={true}
                    />
                  </View>
                </View>
              )}

              {!hasInstallments && (
                <View className="mb-5">
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mb-2 ml-0.5">Invoice Settlement Status</Text>
                  <View className="flex-row gap-2 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
                    {(['paid', 'pending', 'overdue', 'failed'] as const).map((s) => {
                      const active = statusChoice === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          onPress={() => setStatusChoice(s)}
                          style={{ backgroundColor: active ? '#6C47FF' : 'transparent' }}
                          className="flex-1 py-2 rounded-lg items-center"
                        >
                          <Text style={{ color: active ? '#FFFFFF' : colors.textSecondary }} className="text-[10px] font-extrabold uppercase tracking-wide">{s}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <Button
                title="Generate Invoice Receipt"
                onPress={handleCreateInvoice}
                disabled={selectedMemberProgress.isFullyPaid}
                className="rounded-xl mt-2 mb-6"
              />

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT INVOICE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Edit Billing Invoice
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Input
                label="Invoice Number"
                value={editInvoiceNo}
                onChangeText={setEditInvoiceNo}
                icon="receipt-outline"
              />

              <Input
                label="Package Name"
                value={editPlanName}
                onChangeText={setEditPlanName}
                icon="pricetag-outline"
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    label="Issue Date"
                    placeholder="YYYY-MM-DD"
                    value={editInvoiceDate}
                    onChangeText={setEditInvoiceDate}
                    icon="calendar-outline"
                    isDatePicker={true}
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="Due Date"
                    placeholder="YYYY-MM-DD"
                    value={editInvoiceDueDate}
                    onChangeText={setEditInvoiceDueDate}
                    icon="hourglass-outline"
                    isDatePicker={true}
                  />
                </View>
              </View>

              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Billing Currency</Text>
              <View className="flex-row gap-2 mb-4">
                {(['INR', 'USD', 'EUR', 'GBP'] as const).map((curr) => {
                  const isSelected = editCurrency === curr;
                  const label = curr === 'INR' ? 'Rupees (₹)' : curr === 'USD' ? 'USD ($)' : curr === 'EUR' ? 'EUR (€)' : 'GBP (£)';
                  return (
                    <TouchableOpacity
                      key={curr}
                      onPress={() => setEditCurrency(curr)}
                      style={{
                        borderColor: isSelected ? '#6C47FF' : colors.border,
                        backgroundColor: isSelected ? 'rgba(108,71,255,0.08)' : 'transparent',
                        borderWidth: 1.5
                      }}
                      className="px-2.5 py-1.5 rounded-xl flex-1 items-center justify-center"
                    >
                      <Text style={{ color: isSelected ? '#6C47FF' : colors.text }} className="text-[9px] font-extrabold">
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Input
                label={`Subtotal Price (${editCurrency})`}
                value={editSubtotal}
                onChangeText={setEditSubtotal}
                keyboardType="numeric"
                icon="cash-outline"
              />

              <Input
                label={`Custom Add-Ons (${editCurrency})`}
                value={editAddOns}
                onChangeText={setEditAddOns}
                keyboardType="numeric"
                icon="shirt-outline"
              />

              <View className="flex-row items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/30 rounded-xl mb-4">
                <View>
                  <Text style={{ color: colors.text }} className="text-xs font-bold">Two-Installment Billing</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-0.5">Divide payment into 1st & 2nd installment logs</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleToggleEditInstallments(!editHasInstallments)}
                  className={`w-12 h-6 rounded-full px-1 justify-center ${editHasInstallments ? 'bg-primary items-end' : 'bg-gray-300 dark:bg-gray-700 items-start'}`}
                >
                  <View className="w-4.5 h-4.5 bg-white rounded-full" />
                </TouchableOpacity>
              </View>

              {editHasInstallments && (
                <View className="p-3 bg-gray-50 dark:bg-gray-800/10 rounded-xl mb-4 border border-dashed border-gray-200 dark:border-gray-800">
                  <Text style={{ color: colors.text }} className="text-xs font-black mb-3">Installment Settings</Text>
                  
                  <View className="flex-row gap-3 mb-2">
                    <View className="flex-1">
                      <Input
                        label="1st Installment Amt"
                        value={editFirstInstallmentAmt}
                        onChangeText={setEditFirstInstallmentAmt}
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mb-1 ml-0.5">1st Installment Status</Text>
                      <View className="flex-row gap-1 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-xl">
                        {(['paid', 'pending'] as const).map((s) => {
                          const active = editFirstInstallmentStatus === s;
                          return (
                            <TouchableOpacity
                              key={s}
                              onPress={() => setEditFirstInstallmentStatus(s)}
                              style={{ backgroundColor: active ? '#6C47FF' : 'transparent' }}
                              className="flex-1 py-1.5 rounded-lg items-center"
                            >
                              <Text style={{ color: active ? '#FFFFFF' : colors.textSecondary }} className="text-[9px] font-bold uppercase">{s}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Input
                        label="2nd Installment Amt"
                        value={editSecondInstallmentAmt}
                        onChangeText={setEditSecondInstallmentAmt}
                        keyboardType="numeric"
                      />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mb-1 ml-0.5">2nd Installment Status</Text>
                      <View className="flex-row gap-1 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-xl">
                        {(['paid', 'pending'] as const).map((s) => {
                          const active = editSecondInstallmentStatus === s;
                          return (
                            <TouchableOpacity
                              key={s}
                              onPress={() => setEditSecondInstallmentStatus(s)}
                              style={{ backgroundColor: active ? '#6C47FF' : 'transparent' }}
                              className="flex-1 py-1.5 rounded-lg items-center"
                            >
                              <Text style={{ color: active ? '#FFFFFF' : colors.textSecondary }} className="text-[9px] font-bold uppercase">{s}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  <View className="mt-3">
                    <Input
                      label="2nd Installment Due Date"
                      placeholder="YYYY-MM-DD"
                      value={editSecondInstallmentDueDate}
                      onChangeText={setEditSecondInstallmentDueDate}
                      icon="time-outline"
                      isDatePicker={true}
                    />
                  </View>
                </View>
              )}

              {!editHasInstallments && (
                <View className="mb-5">
                  <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mb-2 ml-0.5">Invoice Settlement Status</Text>
                  <View className="flex-row gap-2 bg-gray-100 dark:bg-gray-800/40 p-1 rounded-xl">
                    {(['paid', 'pending', 'overdue', 'failed'] as const).map((s) => {
                      const active = editStatusChoice === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          onPress={() => setEditStatusChoice(s)}
                          style={{ backgroundColor: active ? '#6C47FF' : 'transparent' }}
                          className="flex-1 py-2 rounded-lg items-center"
                        >
                          <Text style={{ color: active ? '#FFFFFF' : colors.textSecondary }} className="text-[10px] font-extrabold uppercase tracking-wide">{s}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <Button
                title="Save Invoice Changes"
                onPress={handleSaveEditInvoice}
                className="rounded-xl mt-2 mb-6"
              />

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MEMBER SELECTOR INNER MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={memberSelectorVisible}
        onRequestClose={() => setMemberSelectorVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-100 dark:border-gray-800 max-h-[70%]">
            <Text style={{ color: colors.text }} className="text-sm font-black mb-3 text-center">Choose Member</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              {gymMembers.map((m) => {
                const isSelected = selectedMemberId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => {
                      setSelectedMemberId(m.id);
                      setMemberSelectorVisible(false);
                    }}
                    style={{ borderColor: isSelected ? '#6C47FF' : colors.border }}
                    className="p-3 border rounded-xl mb-2 flex-row justify-between items-center active:opacity-90 bg-gray-50/50 dark:bg-gray-800/10"
                  >
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{m.name}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color="#6C47FF" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button title="Close Selector" variant="outline" onPress={() => setMemberSelectorVisible(false)} className="rounded-xl" />
          </View>
        </View>
      </Modal>

      {/* MEMBERSHIP PLAN SELECTOR INNER MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={planSelectorVisible}
        onRequestClose={() => setPlanSelectorVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View style={{ backgroundColor: colors.card }} className="w-full max-w-[320px] rounded-3xl p-5 border border-gray-100 dark:border-gray-800 max-h-[70%]">
            <Text style={{ color: colors.text }} className="text-sm font-black mb-3 text-center">Choose Plan</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              {gymPlans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => handleSelectPlan(p)}
                    style={{ borderColor: isSelected ? '#6C47FF' : colors.border }}
                    className="p-3 border rounded-xl mb-2 flex-row justify-between items-center active:opacity-90 bg-gray-50/50 dark:bg-gray-800/10"
                  >
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{p.name} ({formatCurrency(p.price, p.currency)})</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={16} color="#6C47FF" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button title="Close Selector" variant="outline" onPress={() => setPlanSelectorVisible(false)} className="rounded-xl" />
          </View>
        </View>
      </Modal>

    </View>
  );
}
