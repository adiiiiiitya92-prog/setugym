import React, { useState, useContext, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ScrollView, Alert, Switch, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { GymContext } from '../../context/GymContext';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { useToast } from '../../hooks/useToast';
import { useSearch } from '../../hooks/useSearch';
import { validateEmail, validateRequired, validatePhone } from '../../utils/validators';
import { formatDate } from '../../utils/dateHelper';
import { GymOwner, Gym, Invoice } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, parseISO } from 'date-fns';
import { calculateOwnerSubscriptionBalance, getCurrentOwnerInvoices } from '../../utils/membershipBalance';
import { formatCurrency } from '../../utils/currencyHelper';
import { generateInvoicePDF } from '../../utils/invoiceGenerator';

export default function GymOwnersScreen() {
  const { colors, isDark } = useTheme();
  const { impersonateGym } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { owners, gyms, subscriptionPlans, invoices, planUpgradeRequests, dispatch, refetch } = gymContext;

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<GymOwner | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Service Control States
  const [serviceControlModalVisible, setServiceControlModalVisible] = useState(false);
  const [selectedGymForServices, setSelectedGymForServices] = useState<Gym | null>(null);

  // Add Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gymName, setGymName] = useState('');
  const [gymAddress, setGymAddress] = useState('');
  const [gymCity, setGymCity] = useState('');

  // Form error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment Methods
  const paymentMethods = ["Cash", "Card", "UPI", "Bank Transfer", "Cheque"];

  // --- Renewal State Variables ---
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewStartDate, setRenewStartDate] = useState('');
  const [renewPaymentDate, setRenewPaymentDate] = useState('');
  const [renewPaidAmount, setRenewPaidAmount] = useState('');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('Select Payment Method');
  const [renewDiscountType, setRenewDiscountType] = useState<'Percent' | 'Amount'>('Percent');
  const [renewDiscount, setRenewDiscount] = useState('');
  const [renewAdmissionFees, setRenewAdmissionFees] = useState('');
  const [renewComments, setRenewComments] = useState('');
  const [renewPlanSelectorVisible, setRenewPlanSelectorVisible] = useState(false);
  const [renewPayMethodSelectorVisible, setRenewPayMethodSelectorVisible] = useState(false);

  // --- Custom Invoice State Variables ---
  const [manualInvoiceModalVisible, setManualInvoiceModalVisible] = useState(false);
  const [manualInvoiceOwner, setManualInvoiceOwner] = useState<GymOwner | null>(null);
  const [manualPlanId, setManualPlanId] = useState('');
  const [manualInvoiceNo, setManualInvoiceNo] = useState('');
  const [manualInvoiceDate, setManualInvoiceDate] = useState('');
  const [manualInvoiceDueDate, setManualInvoiceDueDate] = useState('');
  const [manualPaidAmount, setManualPaidAmount] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState('Select Payment Method');
  const [manualInvoiceStatus, setManualInvoiceStatus] = useState<'paid' | 'pending' | 'failed'>('pending');
  const [manualComments, setManualComments] = useState('');
  const [manualDiscountType, setManualDiscountType] = useState<'Percent' | 'Amount'>('Percent');
  const [manualDiscount, setManualDiscount] = useState('');
  const [manualAdmissionFees, setManualAdmissionFees] = useState('');
  const [manualPlanSelectorVisible, setManualPlanSelectorVisible] = useState(false);
  const [manualPayMethodSelectorVisible, setManualPayMethodSelectorVisible] = useState(false);

  // --- Edit Invoice State Variables ---
  const [editInvoiceModalVisible, setEditInvoiceModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editPlanId, setEditPlanId] = useState('');
  const [editInvoiceNo, setEditInvoiceNo] = useState('');
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editInvoiceDueDate, setEditInvoiceDueDate] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('Select Payment Method');
  const [editInvoiceStatus, setEditInvoiceStatus] = useState<Invoice['status']>('pending');
  const [editComments, setEditComments] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'Percent' | 'Amount'>('Percent');
  const [editDiscount, setEditDiscount] = useState('');
  const [editAdmissionFees, setEditAdmissionFees] = useState('');
  const [editPlanSelectorVisible, setEditPlanSelectorVisible] = useState(false);
  const [editPayMethodSelectorVisible, setEditPayMethodSelectorVisible] = useState(false);

  // Filter gym owners using useSearch hook
  const filteredOwners = useSearch(owners, searchQuery, ['name', 'email', 'phone']);

  // Dynamic selector to prevent stale state from selectedOwner state copy
  const currentOwner = useMemo(() => {
    if (!selectedOwner) return null;
    return owners.find(o => o.id === selectedOwner.id) || selectedOwner;
  }, [selectedOwner, owners]);

  const getGymForOwner = (owner: GymOwner): Gym | undefined => {
    return gyms.find(g => g.ownerId === owner.id);
  };

  const getGymsForOwner = (owner: GymOwner): Gym[] => {
    return gyms.filter(g => owner.gymIds.includes(g.id));
  };

  const getPlanName = (planId?: string): string => {
    if (!planId) return "Trial Period";
    const plan = subscriptionPlans.find(p => p.id === planId);
    return plan ? plan.name : "Trial Period";
  };

  const getOwnerStatus = (owner: GymOwner): GymOwner['status'] => {
    if (owner.endDate && new Date(owner.endDate) < new Date()) {
      return 'expired';
    }
    return owner.status;
  };

  // --- Memos for calculations ---

  // 1. Renewal calculations
  const renewPlan = useMemo(() => subscriptionPlans.find(p => p.id === renewPlanId), [renewPlanId, subscriptionPlans]);
  const renewPlanPrice = renewPlan ? renewPlan.price : 0;
  const renewPlanCurrency = 'INR';

  const renewDiscountVal = useMemo(() => {
    const discNum = Number(renewDiscount) || 0;
    if (renewDiscountType === 'Percent') {
      return renewPlanPrice * discNum / 100;
    }
    return discNum;
  }, [renewDiscount, renewDiscountType, renewPlanPrice]);

  const renewTotalCost = useMemo(() => {
    const fees = Number(renewAdmissionFees) || 0;
    return Math.max(0, renewPlanPrice + fees - renewDiscountVal);
  }, [renewPlanPrice, renewAdmissionFees, renewDiscountVal]);

  const renewDueAmount = useMemo(() => {
    const paid = Number(renewPaidAmount) || 0;
    return Math.max(0, renewTotalCost - paid);
  }, [renewTotalCost, renewPaidAmount]);

  // 2. Custom Manual Invoice calculations
  const manualPlan = useMemo(() => subscriptionPlans.find(p => p.id === manualPlanId), [manualPlanId, subscriptionPlans]);
  const manualPlanPrice = manualPlan ? manualPlan.price : 0;
  const manualPlanCurrency = 'INR';

  const manualBalance = useMemo(() => {
    if (!currentOwner) {
      return {
        subscriptionAmount: 0,
        totalPaid: 0,
        remainingBalance: 0,
        maximumAllowedInvoiceAmount: 0,
        isFullyPaid: false,
        currency: 'INR',
        plan: undefined
      };
    }
    return calculateOwnerSubscriptionBalance(currentOwner, invoices, subscriptionPlans);
  }, [currentOwner, invoices, subscriptionPlans]);

  const manualInvoiceAmount = useMemo(() => Number(manualPaidAmount) || 0, [manualPaidAmount]);
  const manualDueAmount = useMemo(() => {
    return Math.max(0, manualBalance.remainingBalance - (manualInvoiceStatus === 'paid' ? manualInvoiceAmount : 0));
  }, [manualBalance.remainingBalance, manualInvoiceAmount, manualInvoiceStatus]);

  // 3. Edit Invoice calculations
  const editPlan = useMemo(() => subscriptionPlans.find(p => p.id === editPlanId) || subscriptionPlans.find(p => p.name === editingInvoice?.planName), [editPlanId, editingInvoice, subscriptionPlans]);
  const editPlanPrice = editPlan ? editPlan.price : 0;
  const editPlanCurrency = 'INR';

  const editPlanPriceMemo = useMemo(() => editPlanPrice, [editPlanPrice]);
  const editPlanCurrencyMemo = useMemo<Invoice['currency']>(() => editPlanCurrency as Invoice['currency'], [editPlanCurrency]);

  const editPaidAmountNum = useMemo(() => Number(editPaidAmount) || 0, [editPaidAmount]);
  const editDiscountVal = useMemo(() => {
    const discNum = Number(editDiscount) || 0;
    if (editDiscountType === 'Percent') {
      return editPlanPriceMemo * discNum / 100;
    }
    return discNum;
  }, [editDiscount, editDiscountType, editPlanPriceMemo]);

  const editTotalCost = useMemo(() => {
    const fees = Number(editAdmissionFees) || 0;
    return Math.max(0, editPlanPriceMemo + fees - editDiscountVal);
  }, [editPlanPriceMemo, editAdmissionFees, editDiscountVal]);

  const editDueAmount = useMemo(() => {
    return Math.max(0, editTotalCost - (editInvoiceStatus === 'paid' ? editTotalCost : editPaidAmountNum));
  }, [editTotalCost, editPaidAmountNum, editInvoiceStatus]);

  // Impersonation
  const handleImpersonate = async (owner: GymOwner, gymId: string) => {
    try {
      await impersonateGym(owner, gymId);
      toast.success(`Impersonating ${owner.name} @ ${gyms.find(g => g.id === gymId)?.name}`);
      setDetailModalVisible(false);
      router.replace('/(gym-owner)/dashboard');
    } catch (e) {
      toast.error("Failed to impersonate.");
    }
  };

  const handleOpenServiceControl = (gym: Gym) => {
    setSelectedGymForServices(gym);
    setServiceControlModalVisible(true);
  };

  const handleOpenDetails = (owner: GymOwner) => {
    setSelectedOwner(owner);
    setDetailModalVisible(true);
  };

  const handleAddOwner = () => {
    // Validate
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(name)) tempErrors.name = "Owner name is required.";
    if (!validateRequired(email)) {
      tempErrors.email = "Email is required.";
    } else if (!validateEmail(email)) {
      tempErrors.email = "Please input a valid email.";
    }
    if (!validateRequired(phone)) {
      tempErrors.phone = "Phone number is required.";
    } else if (!validatePhone(phone)) {
      tempErrors.phone = "Please enter a valid telephone.";
    }
    if (!validateRequired(gymName)) tempErrors.gymName = "Gym branch name is required.";
    if (!validateRequired(gymAddress)) tempErrors.gymAddress = "Gym address is required.";
    if (!validateRequired(gymCity)) tempErrors.gymCity = "Gym city is required.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill all mandatory fields.");
      return;
    }

    // Success - Dispatch addition
    const newOwnerId = `owner-${Date.now()}`;
    const newGymId = `gym-${Date.now()}`;

    const newOwner: GymOwner = {
      id: newOwnerId,
      name,
      email,
      phone,
      gymIds: [newGymId],
      planId: undefined, // starts on trial
      status: 'trial',
      trialStartDate: new Date().toISOString(),
      trialDaysRemaining: 7,
      startDate: new Date().toISOString(),
      endDate: addDays(new Date(), 7).toISOString(),
      paidAmount: 0,
      dueAmount: 0
    };

    const newGym: Gym = {
      id: newGymId,
      name: gymName,
      ownerId: newOwnerId,
      addressLine1: gymAddress,
      city: gymCity,
      state: "NY",
      pin: "10001",
      phone,
      email,
      status: 'trial',
      disabledFeatures: ['biometric-attendance']
    };

    dispatch({
      type: 'ADD_OWNER',
      payload: { owner: newOwner, gym: newGym }
    });

    toast.success(`Owner ${name} added successfully!`);
    setAddModalVisible(false);
    
    // Reset fields
    setName('');
    setEmail('');
    setPhone('');
    setGymName('');
    setGymAddress('');
    setGymCity('');
    setErrors({});
  };

  const handleApprove = (ownerId: string) => {
    dispatch({ type: 'APPROVE_OWNER', payload: ownerId });
    toast.success("Owner account approved and activated.");
    setDetailModalVisible(false);
  };

  const handleSuspend = (ownerId: string) => {
    dispatch({ type: 'SUSPEND_OWNER', payload: ownerId });
    toast.warning("Owner account suspended.");
    setDetailModalVisible(false);
  };

  const handleExtendTrial = (ownerId: string) => {
    dispatch({ type: 'EXTEND_TRIAL', payload: ownerId });
    toast.success("Extended free trial by 7 days.");
    setDetailModalVisible(false);
  };

  const handleDelete = (ownerId: string, ownerName: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to permanently delete ${ownerName} and their linked gym branches?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            dispatch({ type: 'DELETE_OWNER', payload: ownerId });
            toast.error("Owner account deleted.");
            setDetailModalVisible(false);
          }
        }
      ]
    );
  };

  // --- Renewal and Custom Invoices Handlers ---

  const handleOpenRenew = (owner: GymOwner) => {
    setRenewPlanId(owner.planId || subscriptionPlans[0]?.id || '');
    
    let startDateToUse = new Date();
    if (owner.endDate && owner.status !== 'expired') {
      const parsedEnd = parseISO(owner.endDate);
      if (!isNaN(parsedEnd.getTime())) {
        startDateToUse = parsedEnd;
      }
    }
    
    const initialPlan = subscriptionPlans.find(p => p.id === (owner.planId || subscriptionPlans[0]?.id));
    
    setRenewStartDate(format(startDateToUse, "yyyy-MM-dd"));
    setRenewPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setRenewPaidAmount(initialPlan ? initialPlan.price.toString() : '');
    setRenewPaymentMethod('Select Payment Method');
    setRenewDiscountType('Percent');
    setRenewDiscount('');
    setRenewAdmissionFees('');
    setRenewComments('');
    
    // Do not dismiss detail modal to prevent React Native Modal overlaps collision
    setRenewModalVisible(true);
  };

  const handleRenew = () => {
    if (!currentOwner) return;
    const plan = subscriptionPlans.find(p => p.id === renewPlanId);
    if (!plan) {
      toast.error("Please select a valid subscription plan.");
      return;
    }

    const start = parseISO(renewStartDate);
    const end = addDays(start, plan.durationDays || 30).toISOString();
    const renewalPaymentAmount = Number(renewPaidAmount) || 0;

    if (renewalPaymentAmount > plan.price) {
      toast.error("Invoice amount cannot exceed the subscription price.");
      return;
    }

    const updatedOwner: GymOwner = {
      ...currentOwner,
      status: 'active',
      planId: renewPlanId,
      startDate: start.toISOString(),
      endDate: end,
      dueAmount: Math.max(0, plan.price - renewalPaymentAmount),
      paidAmount: renewalPaymentAmount,
      paymentMethod: renewPaymentMethod !== 'Select Payment Method' ? renewPaymentMethod : undefined,
      comments: renewComments || currentOwner.comments
    };

    dispatch({ type: 'UPDATE_OWNER', payload: updatedOwner });

    if (renewalPaymentAmount > 0) {
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        memberId: currentOwner.id,
        memberName: currentOwner.name,
        planName: plan.name,
        amount: renewalPaymentAmount,
        date: format(start, "yyyy-MM-dd"),
        dueDate: format(start, "yyyy-MM-dd"),
        status: 'paid',
        subtotal: renewalPaymentAmount,
        tax: 0,
        addOns: 0,
        total: renewalPaymentAmount,
        paidAmount: renewalPaymentAmount,
        dueAmount: 0,
        gymId: currentOwner.gymIds[0] || 'platform',
        currency: 'INR'
      };
      dispatch({ type: 'ADD_INVOICE', payload: newInvoice });
    }

    toast.success(`Subscription renewed successfully!`);
    setRenewModalVisible(false);
  };

  const handleOpenManualInvoice = (owner: GymOwner) => {
    const balance = calculateOwnerSubscriptionBalance(owner, invoices, subscriptionPlans);

    setManualInvoiceOwner(owner);
    setManualPlanId(owner.planId || subscriptionPlans[0]?.id || '');
    setManualInvoiceNo(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setManualInvoiceDate(format(new Date(), "yyyy-MM-dd"));
    setManualInvoiceDueDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    
    const maxVal = balance.remainingBalance > 0 ? balance.remainingBalance : (subscriptionPlans.find(p => p.id === owner.planId)?.price || 0);
    setManualPaidAmount(maxVal.toString());
    setManualPaymentMethod('Select Payment Method');
    setManualInvoiceStatus('pending');
    setManualComments('');
    setManualDiscountType('Percent');
    setManualDiscount('');
    setManualAdmissionFees('');
    
    // Do not dismiss detail modal to prevent React Native Modal overlaps collision
    setManualInvoiceModalVisible(true);
  };

  const handleCreateManualInvoice = () => {
    if (!manualInvoiceOwner) return;
    const plan = subscriptionPlans.find(p => p.id === manualPlanId);
    if (!plan) {
      toast.error("Please select a plan first.");
      return;
    }

    const invoiceAmount = Number(manualPaidAmount) || 0;
    if (invoiceAmount <= 0) {
      toast.error("Please enter an amount.");
      return;
    }

    if (invoiceAmount > plan.price) {
      toast.error(`Amount too high! The maximum for this plan is ₹${plan.price}.`);
      return;
    }

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: manualInvoiceNo,
      memberId: manualInvoiceOwner.id,
      memberName: manualInvoiceOwner.name,
      planName: plan.name,
      amount: invoiceAmount,
      date: manualInvoiceDate,
      dueDate: manualInvoiceDueDate,
      status: manualInvoiceStatus,
      subtotal: invoiceAmount,
      tax: 0,
      addOns: 0,
      total: invoiceAmount,
      paidAmount: manualInvoiceStatus === 'paid' ? invoiceAmount : 0,
      dueAmount: manualInvoiceStatus === 'paid' ? 0 : invoiceAmount,
      gymId: manualInvoiceOwner.gymIds[0] || 'platform',
      currency: 'INR'
    };

    dispatch({ type: 'ADD_INVOICE', payload: newInvoice });
    toast.success("Platform Invoice created successfully!");
    setManualInvoiceModalVisible(false);
  };

  const handleOpenEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditPlanId('');
    setEditInvoiceNo(invoice.invoiceNo);
    setEditInvoiceDate(invoice.date);
    setEditInvoiceDueDate(invoice.dueDate);
    setEditPaidAmount((invoice.paidAmount ?? invoice.amount).toString());
    setEditPaymentMethod(invoice.currency || 'INR');
    setEditInvoiceStatus(invoice.status);
    setEditComments('');
    setEditDiscountType('Percent');
    setEditDiscount('');
    setEditAdmissionFees('');
    
    // Do not dismiss detail modal to prevent React Native Modal overlaps collision
    setEditInvoiceModalVisible(true);
  };

  const handleEditInvoice = () => {
    if (!editingInvoice) return;
    
    const invoiceAmount = Number(editPaidAmount) || 0;
    if (invoiceAmount <= 0) {
      toast.error("Please enter an amount.");
      return;
    }

    if (editPlanPrice > 0 && invoiceAmount > editPlanPrice) {
      toast.error(`Amount too high! The maximum for this plan is ₹${editPlanPrice}.`);
      return;
    }

    const updatedInvoice: Invoice = {
      ...editingInvoice,
      invoiceNo: editInvoiceNo,
      date: editInvoiceDate,
      dueDate: editInvoiceDueDate,
      amount: invoiceAmount,
      total: invoiceAmount,
      subtotal: invoiceAmount,
      status: editInvoiceStatus,
      paidAmount: editInvoiceStatus === 'paid' ? invoiceAmount : 0,
      dueAmount: editInvoiceStatus === 'paid' ? 0 : invoiceAmount
    };

    dispatch({ type: 'UPDATE_INVOICE', payload: updatedInvoice });
    toast.success("Invoice updated successfully!");
    setEditInvoiceModalVisible(false);
  };

  // Helper function to build PDF invoice and share it directly
  const handleSendInvoicePDF = async (invoice: Invoice) => {
    if (!currentOwner) return;
    const gym = getGymForOwner(currentOwner) || {
      id: "platform",
      name: "SetuGym Platform",
      ownerId: "super-admin",
      addressLine1: "SetuGym Headquarters",
      city: "New York",
      state: "NY",
      pin: "10001",
      phone: "+1 555-000-0000",
      email: "billing@setugym.com",
      status: "active"
    };

    const res = await generateInvoicePDF(invoice, gym);
    if (!res.success) {
      toast.error(res.error || "Failed to generate PDF.");
    }
  };

  // Pull refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-5">
      <SearchBar 
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search gym owners by name/email..."
      />

      <FlatList
        data={filteredOwners}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => {
          const gym = getGymForOwner(item);
          return (
            <Card onPress={() => handleOpenDetails(item)} className="mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                  <Avatar name={item.name} size={44} />
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text style={{ color: colors.text }} className="text-base font-black" numberOfLines={1}>
                        {item.name}
                      </Text>
                      {getOwnerStatus(item) === 'expired' && (
                        <View className="bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                          <Text className="text-red-500 text-[8px] font-black uppercase">Expired</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold" numberOfLines={1}>
                      {gym ? gym.name : "No gym branch linked"}
                    </Text>
                  </View>
                </View>
                <Badge status={getOwnerStatus(item)} />
              </View>

              <View className="flex-row justify-between border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
                <View>
                  <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Subscription Tier</Text>
                  <Text style={{ color: colors.text }} className="text-xs font-bold mt-0.5">{getPlanName(item.planId)}</Text>
                </View>
                <View className="items-end">
                  <Text style={{ color: colors.textSecondary }} className="text-[9px] font-bold uppercase tracking-wider">Trial Status</Text>
                  <Text style={{ color: item.trialDaysRemaining <= 3 && item.status === 'trial' ? colors.accent : colors.text }} className="text-xs font-bold mt-0.5">
                    {getOwnerStatus(item) === 'expired' ? "Expired" : (item.status === 'active' ? "Active Member" : `${item.trialDaysRemaining} Days Left`)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Card className="items-center py-10">
            <Text className="text-4xl mb-3">🏢</Text>
            <Text style={{ color: colors.text }} className="text-base font-bold">No Gym Owners Found</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1 leading-4 max-w-[200px]">
              Click the 'Add Owner' button below to register a new gym operator!
            </Text>
          </Card>
        }
      />

      {/* Floating trigger button */}
      <TouchableOpacity
        onPress={() => router.push('/(super-admin)/add-gym-owner')}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* DETAILED DRILLDOWN MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            {currentOwner && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-6">
                  <Text style={{ color: colors.text }} className="text-xl font-black">
                    Owner Profile
                  </Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="p-1">
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Info Card */}
                <View className="items-center mb-6">
                  <Avatar name={currentOwner.name} size={64} />
                  <View className="flex-row items-center gap-1.5 mt-3 justify-center">
                    <Text style={{ color: colors.text }} className="text-lg font-black text-center">
                      {currentOwner.name}
                    </Text>
                    {getOwnerStatus(currentOwner) === 'expired' && (
                      <View className="bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                        <Text className="text-red-500 text-[8px] font-black uppercase">Expired</Text>
                      </View>
                    )}
                  </View>
                  <Badge status={getOwnerStatus(currentOwner)} style={{ marginTop: 6 }} />
                </View>

                <View className="space-y-3.5 mb-8">
                  <View className="flex-row justify-between">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Email address</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{currentOwner.email}</Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Phone number</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{currentOwner.phone}</Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Registered Gym</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">
                      {getGymForOwner(currentOwner)?.name || "N/A"}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Subscription tier</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">
                      {getPlanName(currentOwner.planId)}
                    </Text>
                  </View>
                  {currentOwner.status === 'trial' && (
                    <>
                      <View className="flex-row justify-between mt-2">
                        <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Trial registration date</Text>
                        <Text style={{ color: colors.text }} className="text-xs font-semibold">
                          {formatDate(currentOwner.trialStartDate)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mt-2">
                        <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Days left remaining</Text>
                        <Text style={{ color: colors.text }} className="text-xs font-black">
                          {currentOwner.trialDaysRemaining} days
                        </Text>
                      </View>
                    </>
                  )}
                  {(currentOwner.status === 'active' || getOwnerStatus(currentOwner) === 'expired') && currentOwner.endDate && (
                    <View className="flex-row justify-between mt-2">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Expiry Date</Text>
                      <Text style={{ color: colors.text }} className="text-xs font-bold">
                        {formatDate(currentOwner.endDate)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Subscription Balance (Matches Member Management) */}
                <View className="mb-6 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-2xl">
                  <Text style={{ color: colors.text }} className="text-sm font-black mb-3">Subscription Dues</Text>
                  <View className="flex-row justify-between mb-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs">Plan Charge</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">
                      {formatCurrency(subscriptionPlans.find(p => p.id === currentOwner.planId)?.price || 0, 'INR')}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs">Total Paid Amount</Text>
                    <Text className="text-emerald-500 text-xs font-bold">
                      {formatCurrency(currentOwner.paidAmount || 0, 'INR')}
                    </Text>
                  </View>
                  <View className="flex-row justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
                    <Text style={{ color: colors.text }} className="text-xs font-bold">Remaining Due</Text>
                    <Text style={{ color: (currentOwner.dueAmount || 0) > 0 ? colors.accent : colors.text }} className="text-xs font-black">
                      {formatCurrency(currentOwner.dueAmount || 0, 'INR')}
                    </Text>
                  </View>
                </View>

                {/* Transaction history section (Matches Member management invoices section) */}
                <View className="flex-row justify-between items-center mb-3">
                  <Text style={{ color: colors.text }} className="text-sm font-black">Transaction History</Text>
                  {(!currentOwner.planId || currentOwner.status === 'trial' || (currentOwner.dueAmount ?? 0) > 0) && (
                    <TouchableOpacity
                      onPress={() => handleOpenManualInvoice(currentOwner)}
                      className="flex-row items-center"
                    >
                      <Ionicons name="add" size={14} color="#008080" />
                      <Text style={{ color: '#008080' }} className="text-xs font-bold ml-0.5">
                        + Create Invoice
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View className="mb-6 space-y-2">
                  {invoices.filter(i => i.memberId === currentOwner.id).length === 0 ? (
                    <Card className="items-center py-4 bg-gray-50/50 dark:bg-gray-800/10">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No platform transactions recorded.</Text>
                    </Card>
                  ) : (
                    invoices.filter(i => i.memberId === currentOwner.id).map(i => (
                      <View key={i.id} className="flex-row justify-between bg-gray-50/50 dark:bg-gray-800/20 p-2.5 rounded-lg items-center">
                        <View className="flex-1">
                          <Text style={{ color: colors.text }} className="text-xs font-bold">{i.invoiceNo}</Text>
                          <Text style={{ color: colors.textSecondary }} className="text-[9px] mt-0.5">{formatDate(i.date)}</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-primary font-black text-xs mr-1">{formatCurrency(i.total, i.currency)}</Text>
                          <Badge status={i.status} style={{ paddingVertical: 1, paddingHorizontal: 6 }} />
                          <TouchableOpacity
                            onPress={() => handleSendInvoicePDF(i)}
                            className="p-1 bg-emerald-500/10 rounded-full ml-1"
                          >
                            <Ionicons name="logo-whatsapp" size={14} color="#10B981" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleSendInvoicePDF(i)}
                            className="p-1 bg-primary/10 rounded-full ml-1"
                          >
                            <Ionicons name="document-text" size={14} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              if (i.status === 'paid' || (i.dueAmount ?? 0) <= 0) {
                                toast.warning("This invoice is fully settled (PAID).");
                                return;
                              }
                              handleOpenEditInvoice(i);
                            }}
                            style={{ opacity: (i.status === 'paid' || (i.dueAmount ?? 0) <= 0) ? 0.4 : 1 }}
                            className="p-1 bg-blue-500/10 rounded-full ml-1"
                          >
                            <Ionicons name="pencil" size={14} color="#3B82F6" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Linked Branches & Controls */}
                <Text style={{ color: colors.text }} className="text-sm font-black mb-3 mt-4">Linked Branches & Controls</Text>
                <View className="mb-6">
                  {getGymsForOwner(currentOwner).map((gymBranch) => (
                    <Card key={gymBranch.id} style={{ borderColor: colors.border }} className="p-3 border mb-3">
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1 mr-2">
                          <Text style={{ color: colors.text }} className="text-xs font-bold">{gymBranch.name}</Text>
                          <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-0.5">{gymBranch.city}, {gymBranch.state}</Text>
                        </View>
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            onPress={() => handleImpersonate(currentOwner, gymBranch.id)}
                            className="bg-primary/10 px-2.5 py-1.5 rounded-lg active:scale-95"
                          >
                            <Text className="text-primary font-bold text-[10px] uppercase">Login</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleOpenServiceControl(gymBranch)}
                            style={{ backgroundColor: colors.border }}
                            className="px-2.5 py-1.5 rounded-lg active:scale-95"
                          >
                            <Text style={{ color: colors.text }} className="font-bold text-[10px] uppercase">Services</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>

                {/* Operations grid */}
                <Text style={{ color: colors.text }} className="text-sm font-black mb-3">Admin Actions</Text>
                <View className="flex-row flex-wrap justify-between gap-3 mb-6">
                  {currentOwner.status === 'suspended' || currentOwner.status === 'trial' ? (
                    <TouchableOpacity
                      onPress={() => handleApprove(currentOwner.id)}
                      className="w-[48%] py-3.5 bg-secondary rounded-xl items-center"
                    >
                      <Text className="text-white font-bold text-xs uppercase tracking-wide">Approve / Activate</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleSuspend(currentOwner.id)}
                      className="w-[48%] py-3.5 bg-accent rounded-xl items-center"
                    >
                      <Text className="text-white font-bold text-xs uppercase tracking-wide">Suspend Owner</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleExtendTrial(currentOwner.id)}
                    className="w-[48%] py-3.5 bg-gray-500 rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs uppercase tracking-wide">Extend Trial +7d</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenRenew(currentOwner)}
                    className="w-full py-3.5 bg-primary rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs uppercase tracking-wide">Renew Plan / Update Tier</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(currentOwner.id, currentOwner.name)}
                    className="w-full py-3.5 border border-red-500 rounded-xl items-center mt-1"
                  >
                    <Text className="text-red-500 font-bold text-xs uppercase tracking-wide">Delete Account</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* REGISTRATION MODAL FORM */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: colors.text }} className="text-xl font-black">
                Register Gym Owner
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="space-y-2">
              <Input
                label="Owner Full Name"
                placeholder="e.g. John Miller"
                value={name}
                onChangeText={setName}
                error={errors.name}
                icon="person-outline"
              />

              <Input
                label="Email Address"
                placeholder="e.g. owner@gym.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
              />

              <Input
                label="Phone Number"
                placeholder="e.g. +1 555-123-4567"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <Input
                label="Gym Brand Name"
                placeholder="e.g. Iron Muscle Hub"
                value={gymName}
                onChangeText={setGymName}
                error={errors.gymName}
                icon="business-outline"
              />

              <Input
                label="Gym Address"
                placeholder="e.g. 102 Powerhouse Drive"
                value={gymAddress}
                onChangeText={setGymAddress}
                error={errors.gymAddress}
                icon="map-outline"
              />

              <Input
                label="City"
                placeholder="e.g. New York"
                value={gymCity}
                onChangeText={setGymCity}
                error={errors.gymCity}
                icon="location-outline"
              />

              <Button
                title="Create Account (Start 7-Day Trial)"
                onPress={handleAddOwner}
                className="mt-6 rounded-xl"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SERVICE CONTROL MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={serviceControlModalVisible}
        onRequestClose={() => setServiceControlModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
              <View>
                <Text style={{ color: colors.text }} className="text-xl font-black">
                  Service Control
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-[10px] font-semibold mt-0.5">
                  {selectedGymForServices?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setServiceControlModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {[
                { key: 'attendance', label: 'Attendance & Check-in Logs', desc: 'Allows members to check-in and staff to view attendance logs' },
                { key: 'biometric-attendance', label: 'Biometric Device Attendance', desc: 'Allows owners to configure and sync logs from physical biometric devices (e.g. ZKTeco)' },
                { key: 'membership-plans', label: 'Membership Plans', desc: 'Allows managing gym membership packages and plans' },
                { key: 'notices', label: 'Broadcast Notices', desc: 'Allows broadcasting announcements and notices to members/staff' },
                { key: 'qr-generator', label: 'Reception QR Code', desc: 'Allows generating gym entry QR codes for members' },
                { key: 'enquiries', label: 'Visitor Enquiries', desc: 'Allows managing prospective member enquiries and visitors' },
                { key: 'diet-plans', label: 'Diet Plans & Blueprints', desc: 'Allows trainers and owners to create diet plans for members' },
                { key: 'workout-plans', label: 'Workout Plans & Splits', desc: 'Allows trainers and owners to create workout splits' },
                { key: 'financial', label: 'Financial Portal & Billing', desc: 'Hides or shows the complete revenue/billing dashboard' },
                { key: 'expenses', label: 'Expenses Tracker', desc: 'Allows gym owners to record utility payments, rent, salaries, and track monthly expenses' },
                { key: 'staff', label: 'Trainer & Staff Directory', desc: 'Hides or shows the trainer management screen' },
                { key: 'members', label: 'Member Management Screen', desc: 'Hides or shows the gym members directory' },
              ].map((feature) => {
                const isEnabled = !(selectedGymForServices?.disabledFeatures || []).includes(feature.key);
                return (
                  <View key={feature.key} className="flex-row items-center justify-between p-3.5 border border-gray-100 dark:border-gray-800 rounded-2xl mb-2.5">
                    <View className="flex-1 mr-4">
                      <Text style={{ color: colors.text }} className="text-xs font-bold">{feature.label}</Text>
                      <Text style={{ color: colors.textSecondary }} className="text-[10px] mt-0.5 leading-4">{feature.desc}</Text>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => {
                        dispatch({
                          type: 'TOGGLE_GYM_FEATURE',
                          payload: { gymId: selectedGymForServices!.id, featureKey: feature.key }
                        });
                        setSelectedGymForServices(prev => {
                          if (!prev) return null;
                          const currentDisabled = prev.disabledFeatures || [];
                          const nextDisabled = currentDisabled.includes(feature.key)
                            ? currentDisabled.filter(k => k !== feature.key)
                            : [...currentDisabled, feature.key];
                          return { ...prev, disabledFeatures: nextDisabled };
                        });
                        toast.success(`${isEnabled ? 'Disabled' : 'Enabled'} ${feature.label}`);
                      }}
                      trackColor={{ false: colors.border, true: '#6C47FF' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                );
              })}

              <Button
                title="Done"
                onPress={() => setServiceControlModalVisible(false)}
                className="mt-4 rounded-xl"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* RENEW PLAN FULL-SCREEN MODAL */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={renewModalVisible}
        onRequestClose={() => {
          setRenewModalVisible(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{ backgroundColor: '#005C5C', height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => {
              setRenewModalVisible(false);
            }} className="p-1">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-lg ml-4">Renew Subscription</Text>
          </View>

          {currentOwner && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              
              {/* Select Plan Dropdown */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Select Subscription Plan</Text>
                <TouchableOpacity 
                  onPress={() => setRenewPlanSelectorVisible(true)} 
                  style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }} 
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="document-text-outline" size={18} color="#008080" className="mr-3" />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">
                      {renewPlanId ? `${getPlanName(renewPlanId)} (${renewPlanPrice})` : "Select Subscription Plan"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Plan Amount Display */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.text }} className="text-sm font-bold">
                  Plan Amount: {formatCurrency(renewPlanPrice, renewPlanCurrency)}
                </Text>
              </View>

              {/* Plan Start Date */}
              <Input
                label="Subscription Start Date *"
                placeholder="e.g. 2026-06-08"
                value={renewStartDate}
                onChangeText={setRenewStartDate}
                icon="calendar-outline"
                isDatePicker={true}
              />

              {/* Payment Date */}
              <Input
                label="Payment Date"
                placeholder="e.g. 2026-06-08"
                value={renewPaymentDate}
                onChangeText={setRenewPaymentDate}
                icon="calendar-outline"
                isDatePicker={true}
              />

              {/* Paid Amount */}
              <Input
                label="Paid Amount"
                placeholder="Enter paid amount"
                value={renewPaidAmount}
                onChangeText={setRenewPaidAmount}
                keyboardType="numeric"
                icon="cash-outline"
              />

              {/* Payment Method Selector */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Payment Method</Text>
                <TouchableOpacity 
                  onPress={() => setRenewPayMethodSelectorVisible(true)} 
                  style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }} 
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="card-outline" size={18} color="#008080" className="mr-3" />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">{renewPaymentMethod}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Due Amount Display */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.text }} className="text-sm font-bold">
                  Due Amount: {formatCurrency(renewDueAmount, renewPlanCurrency)}
                </Text>
              </View>

              {/* Comments */}
              <Input
                label="Comments"
                placeholder="Enter comments"
                value={renewComments}
                onChangeText={setRenewComments}
                icon="chatbubble-ellipses-outline"
              />

              {/* Discount in Plan Section */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mb-2">Discount in Plan:</Text>
                
                {/* Ratio Toggles */}
                <View className="flex-row gap-6 mb-3 items-center">
                  <Ionicons name="funnel-outline" size={18} color="#008080" className="mr-0.5" />
                  <TouchableOpacity onPress={() => setRenewDiscountType('Percent')} className="flex-row items-center">
                    <Ionicons 
                      name={renewDiscountType === 'Percent' ? "radio-button-on" : "radio-button-off"} 
                      size={18} 
                      color={renewDiscountType === 'Percent' ? '#008080' : colors.textSecondary} 
                    />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Percent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setRenewDiscountType('Amount')} className="flex-row items-center">
                    <Ionicons 
                      name={renewDiscountType === 'Amount' ? "radio-button-on" : "radio-button-off"} 
                      size={18} 
                      color={renewDiscountType === 'Amount' ? '#008080' : colors.textSecondary} 
                    />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Amount</Text>
                  </TouchableOpacity>
                </View>

                <Input
                  placeholder={renewDiscountType === 'Percent' ? "Discount Percent (%)" : "Discount Amount"}
                  value={renewDiscount}
                  onChangeText={setRenewDiscount}
                  keyboardType="numeric"
                  icon="pricetag-outline"
                />
              </View>

              {/* Setup Fees */}
              <Input
                label="Setup/Admission Fees"
                placeholder="Setup Fees"
                value={renewAdmissionFees}
                onChangeText={setRenewAdmissionFees}
                keyboardType="numeric"
                icon="barbell-outline"
              />

              {/* Save Button */}
              <Button
                title="Save"
                onPress={handleRenew}
                style={{ backgroundColor: '#005C5C', height: 48 }}
                className="rounded-xl mt-6 mb-8"
              />

            </ScrollView>
          )}
        </View>
      </Modal>

      {/* MANUAL INVOICE CREATION FULL-SCREEN MODAL */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={manualInvoiceModalVisible}
        onRequestClose={() => {
          setManualInvoiceModalVisible(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{ backgroundColor: '#005C5C', height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => {
              setManualInvoiceModalVisible(false);
            }} className="p-1">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-lg ml-4">Create Invoice</Text>
          </View>

          {manualInvoiceOwner && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              
              {/* Select Plan */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Select Subscription Plan</Text>
                <TouchableOpacity 
                  onPress={() => setManualPlanSelectorVisible(true)} 
                  style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }} 
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="document-text-outline" size={18} color="#008080" className="mr-3" />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">
                      {manualPlanId ? `${getPlanName(manualPlanId)} (${manualPlanPrice})` : "Select Subscription Plan"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Plan Amount Display */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.text }} className="text-sm font-bold">
                  Plan Amount: {formatCurrency(manualPlanPrice, manualPlanCurrency)}
                </Text>
              </View>

              {/* Invoice Number */}
              <Input
                label="Invoice Number *"
                placeholder="e.g. INV-2026-001"
                value={manualInvoiceNo}
                onChangeText={setManualInvoiceNo}
                icon="document-text-outline"
              />

              {/* Invoice Date */}
              <Input
                label="Invoice Date"
                placeholder="e.g. 2026-06-08"
                value={manualInvoiceDate}
                onChangeText={setManualInvoiceDate}
                icon="calendar-outline"
                isDatePicker={true}
              />

              {/* Invoice Due Date */}
              <Input
                label="Invoice Due Date"
                placeholder="e.g. 2026-06-15"
                value={manualInvoiceDueDate}
                onChangeText={setManualInvoiceDueDate}
                icon="calendar-outline"
                isDatePicker={true}
              />

              {/* Invoice Amount */}
              <Input
                label="Invoice Amount"
                placeholder={`Enter amount to bill`}
                value={manualPaidAmount}
                onChangeText={setManualPaidAmount}
                keyboardType="numeric"
                icon="cash-outline"
              />

              {/* Payment Method Selector */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Payment Method</Text>
                <TouchableOpacity 
                  onPress={() => setManualPayMethodSelectorVisible(true)} 
                  style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }} 
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="card-outline" size={18} color="#008080" className="mr-3" />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">{manualPaymentMethod}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Remaining Balance Display */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.text }} className="text-sm font-bold">
                  Remaining Balance After Invoice: {formatCurrency(manualDueAmount, manualPlanCurrency)}
                </Text>
              </View>

              {/* Invoice Status Selector */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 pl-0.5">Invoice Status *</Text>
                <View className="flex-row gap-3">
                  {(['pending', 'paid', 'failed'] as const).map((statusVal) => {
                    const isActive = manualInvoiceStatus === statusVal;
                    const statusColor = 
                      statusVal === 'paid' ? '#10B981' : 
                      statusVal === 'failed' ? '#EF4444' : '#F59E0B';
                    return (
                      <TouchableOpacity
                        key={statusVal}
                        onPress={() => setManualInvoiceStatus(statusVal)}
                        style={{
                          flex: 1,
                          borderColor: isActive ? statusColor : colors.border,
                          borderWidth: 1.5,
                          backgroundColor: isActive ? `${statusColor}10` : colors.card,
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: isActive ? statusColor : colors.text,
                            fontWeight: 'bold',
                            fontSize: 12,
                            textTransform: 'capitalize'
                          }}
                        >
                          {statusVal}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Comments */}
              <Input
                label="Comments"
                placeholder="Enter comments"
                value={manualComments}
                onChangeText={setManualComments}
                icon="chatbubble-ellipses-outline"
              />

              {/* Discount in Plan Section */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mb-2">Discount in Plan:</Text>
                
                {/* Ratio Toggles */}
                <View className="flex-row gap-6 mb-3 items-center">
                  <Ionicons name="funnel-outline" size={18} color="#008080" className="mr-0.5" />
                  <TouchableOpacity onPress={() => setManualDiscountType('Percent')} className="flex-row items-center">
                    <Ionicons 
                      name={manualDiscountType === 'Percent' ? "radio-button-on" : "radio-button-off"} 
                      size={18} 
                      color={manualDiscountType === 'Percent' ? '#008080' : colors.textSecondary} 
                    />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Percent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setManualDiscountType('Amount')} className="flex-row items-center">
                    <Ionicons 
                      name={manualDiscountType === 'Amount' ? "radio-button-on" : "radio-button-off"} 
                      size={18} 
                      color={manualDiscountType === 'Amount' ? '#008080' : colors.textSecondary} 
                    />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Amount</Text>
                  </TouchableOpacity>
                </View>

                <Input
                  placeholder={manualDiscountType === 'Percent' ? "Discount Percent (%)" : "Discount Amount"}
                  value={manualDiscount}
                  onChangeText={setManualDiscount}
                  keyboardType="numeric"
                  icon="pricetag-outline"
                />
              </View>

              {/* Setup Fees */}
              <Input
                label="Setup Fees"
                placeholder="Setup Fees"
                value={manualAdmissionFees}
                onChangeText={setManualAdmissionFees}
                keyboardType="numeric"
                icon="barbell-outline"
              />

              {/* Save Button */}
              <Button
                title="Save"
                onPress={handleCreateManualInvoice}
                style={{ backgroundColor: '#005C5C', height: 48 }}
                className="rounded-xl mt-6 mb-8"
              />

            </ScrollView>
          )}
        </View>
      </Modal>

      {/* EDIT INVOICE FULL-SCREEN MODAL */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={editInvoiceModalVisible}
        onRequestClose={() => {
          setEditInvoiceModalVisible(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{ backgroundColor: '#005C5C', height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => {
              setEditInvoiceModalVisible(false);
            }} className="p-1">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-lg ml-4">Edit Invoice</Text>
          </View>

          {editingInvoice && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              
              {/* Select Plan */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Select Subscription Plan *</Text>
                <TouchableOpacity 
                  onPress={() => setEditPlanSelectorVisible(true)} 
                  style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }} 
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="document-text-outline" size={18} color="#008080" className="mr-3" />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">
                      {editPlanId ? `${getPlanName(editPlanId)} (${editPlanPriceMemo})` : `${editingInvoice.planName} (${editPlanPriceMemo})`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Plan Amount Display */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.text }} className="text-sm font-bold">
                  Plan Amount: {formatCurrency(editPlanPriceMemo, editPlanCurrencyMemo)}
                </Text>
              </View>

              {/* Invoice Number */}
              <Input
                label="Invoice Number *"
                placeholder="e.g. INV-2026-001"
                value={editInvoiceNo}
                onChangeText={setEditInvoiceNo}
                icon="document-text-outline"
              />

              {/* Invoice Date */}
              <Input
                label="Invoice Date"
                placeholder="e.g. 2026-06-08"
                value={editInvoiceDate}
                onChangeText={setEditInvoiceDate}
                icon="calendar-outline"
                isDatePicker={true}
              />

              {/* Invoice Due Date */}
              <Input
                label="Invoice Due Date"
                placeholder="e.g. 2026-06-15"
                value={editInvoiceDueDate}
                onChangeText={setEditInvoiceDueDate}
                icon="calendar-outline"
                isDatePicker={true}
              />

              {/* Paid Amount */}
              <Input
                label="Invoice Amount"
                placeholder="Enter billed amount"
                value={editPaidAmount}
                onChangeText={setEditPaidAmount}
                keyboardType="numeric"
                icon="cash-outline"
              />

              {/* Due Amount Display */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.text }} className="text-sm font-bold">
                  Due Amount: {formatCurrency(editDueAmount, editPlanCurrencyMemo)}
                </Text>
              </View>

              {/* Invoice Status Selector */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 pl-0.5">Invoice Status *</Text>
                <View className="flex-row gap-3">
                  {(['pending', 'paid', 'failed', 'overdue'] as const).map((statusVal) => {
                    const isActive = editInvoiceStatus === statusVal;
                    const statusColor = 
                      statusVal === 'paid' ? '#10B981' : 
                      statusVal === 'failed' ? '#EF4444' : 
                      statusVal === 'overdue' ? '#F59E0B' : '#6B7280';
                    return (
                      <TouchableOpacity
                        key={statusVal}
                        onPress={() => setEditInvoiceStatus(statusVal)}
                        style={{
                          flex: 1,
                          borderColor: isActive ? statusColor : colors.border,
                          borderWidth: 1.5,
                          backgroundColor: isActive ? `${statusColor}10` : colors.card,
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: isActive ? statusColor : colors.text,
                            fontWeight: 'bold',
                            fontSize: 11,
                            textTransform: 'capitalize'
                          }}
                        >
                          {statusVal}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Comments */}
              <Input
                label="Comments"
                placeholder="Enter comments"
                value={editComments}
                onChangeText={setEditComments}
                icon="chatbubble-ellipses-outline"
              />

              {/* Save Button */}
              <Button
                title="Save Changes"
                onPress={handleEditInvoice}
                style={{ backgroundColor: '#005C5C', height: 48 }}
                className="rounded-xl mt-6 mb-8"
              />

            </ScrollView>
          )}
        </View>
      </Modal>

      {/* RENEW SELECT PLAN SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={renewPlanSelectorVisible}
        onRequestClose={() => setRenewPlanSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Subscription Plan</Text>
              <TouchableOpacity onPress={() => setRenewPlanSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {subscriptionPlans.map((pChoice) => (
                <TouchableOpacity
                  key={pChoice.id}
                  onPress={() => {
                    setRenewPlanId(pChoice.id);
                    setRenewPlanSelectorVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{pChoice.name}</Text>
                  <Text style={{ color: '#00C896' }} className="text-xs font-black">
                    {formatCurrency(pChoice.price, 'INR')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* RENEW SELECT PAYMENT METHOD SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={renewPayMethodSelectorVisible}
        onRequestClose={() => setRenewPayMethodSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Payment Method</Text>
              <TouchableOpacity onPress={() => setRenewPayMethodSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {paymentMethods.map((mChoice) => (
                <TouchableOpacity
                  key={mChoice}
                  onPress={() => {
                    setRenewPaymentMethod(mChoice);
                    setRenewPayMethodSelectorVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{mChoice}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MANUAL SELECT PLAN SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={manualPlanSelectorVisible}
        onRequestClose={() => setManualPlanSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Subscription Plan</Text>
              <TouchableOpacity onPress={() => setManualPlanSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {subscriptionPlans.map((pChoice) => (
                <TouchableOpacity
                  key={pChoice.id}
                  onPress={() => {
                    setManualPlanId(pChoice.id);
                    setManualPlanSelectorVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{pChoice.name}</Text>
                  <Text style={{ color: '#00C896' }} className="text-xs font-black">
                    {formatCurrency(pChoice.price, 'INR')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MANUAL SELECT PAYMENT METHOD SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={manualPayMethodSelectorVisible}
        onRequestClose={() => setManualPayMethodSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Payment Method</Text>
              <TouchableOpacity onPress={() => setManualPayMethodSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {paymentMethods.map((mChoice) => (
                <TouchableOpacity
                  key={mChoice}
                  onPress={() => {
                    setManualPaymentMethod(mChoice);
                    setManualPayMethodSelectorVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{mChoice}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT SELECT PLAN SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editPlanSelectorVisible}
        onRequestClose={() => setEditPlanSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Subscription Plan</Text>
              <TouchableOpacity onPress={() => setEditPlanSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {subscriptionPlans.map((pChoice) => (
                <TouchableOpacity
                  key={pChoice.id}
                  onPress={() => {
                    setEditPlanId(pChoice.id);
                    setEditPlanSelectorVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{pChoice.name}</Text>
                  <Text style={{ color: '#00C896' }} className="text-xs font-black">
                    {formatCurrency(pChoice.price, 'INR')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT SELECT PAYMENT METHOD SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editPayMethodSelectorVisible}
        onRequestClose={() => setEditPayMethodSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Payment Method</Text>
              <TouchableOpacity onPress={() => setEditPayMethodSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {paymentMethods.map((mChoice) => (
                <TouchableOpacity
                  key={mChoice}
                  onPress={() => {
                    setEditPaymentMethod(mChoice);
                    setEditPayMethodSelectorVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{mChoice}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
