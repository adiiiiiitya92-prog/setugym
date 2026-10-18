import React, { useState, useContext, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  Alert, 
  Share, 
  Image, 
  TextInput, 
  Switch, 
  Linking 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { GymContext } from '../../context/GymContext';
import { Card } from '../../components/ui/Card';
import { MemberCard } from '../../components/MemberCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/dateHelper';
import { Member, MemberPlan, Trainer, Invoice, AttendanceRecord } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { addDays, parseISO, format } from 'date-fns';
import { formatCurrency } from '../../utils/currencyHelper';
import QRCode from 'react-native-qrcode-svg';
import { generateInvoicePDF } from '../../utils/invoiceGenerator';
import { calculateMembershipBalance } from '../../utils/membershipBalance';


type FilterType = 
  | 'all' 
  | 'active' 
  | 'inactive' 
  | 'unpaid' 
  | 'paid' 
  | 'expiring_1_3' 
  | 'expiring_4_7' 
  | 'expiring_8_15' 
  | 'birthday_today' 
  | 'blocked';

type SortType = 
  | 'registered_newest_oldest' 
  | 'registered_oldest_newest' 
  | 'alphabetical_az' 
  | 'alphabetical_za' 
  | 'due_amount_high_low';

export default function MembersScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const gymContext = useContext(GymContext);

  if (!gymContext) return null;
  const { members, memberPlans, trainers, invoices, attendanceRecords, gyms, dispatch } = gymContext;

  const activeGymId = user?.gymId || 'gym-fitzone-1';

  // Filters & State Managers
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'mobile' | 'membershipId'>('name');
  const [mIdSearchOnly, setMIdSearchOnly] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('registered_newest_oldest');
  const [refreshing, setRefreshing] = useState(false);

  // Selector sheets / filter modals
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  // Member Action modals
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [renewModalVisible, setRenewModalVisible] = useState(false);

  // Custom WhatsApp message template modal states
  const [whatsappModalVisible, setWhatsappModalVisible] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappMember, setWhatsappMember] = useState<Member | null>(null);

  // Gym Pass Card state
  const [idCardModalVisible, setIdCardModalVisible] = useState(false);
  const [idCardMember, setIdCardMember] = useState<Member | null>(null);
  const [passStyle, setPassStyle] = useState<'modern' | 'classic' | 'bold'>('modern');

  // Manual Custom Invoice Form states
  const [manualInvoiceModalVisible, setManualInvoiceModalVisible] = useState(false);
  const [manualInvoiceMember, setManualInvoiceMember] = useState<Member | null>(null);
  const [manualPlanId, setManualPlanId] = useState('');
  const [manualInvoiceNo, setManualInvoiceNo] = useState('');
  const [manualInvoiceDate, setManualInvoiceDate] = useState('');
  const [manualInvoiceDueDate, setManualInvoiceDueDate] = useState('');
  const [manualPaidAmount, setManualPaidAmount] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState('Select Payment Method');
  const [manualComments, setManualComments] = useState('');
  const [manualDiscountType, setManualDiscountType] = useState<'Percent' | 'Amount'>('Percent');
  const [manualDiscount, setManualDiscount] = useState('');
  const [manualAdmissionFees, setManualAdmissionFees] = useState('');
  const [manualPlanSelectorVisible, setManualPlanSelectorVisible] = useState(false);
  const [manualPayMethodSelectorVisible, setManualPayMethodSelectorVisible] = useState(false);
  const [manualInvoiceStatus, setManualInvoiceStatus] = useState<'paid' | 'pending' | 'failed'>('pending');

  // Edit Custom Invoice Form states
  const [editInvoiceModalVisible, setEditInvoiceModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editPlanId, setEditPlanId] = useState('');
  const [editPlanPrice, setEditPlanPrice] = useState(0);
  const [editPlanCurrency, setEditPlanCurrency] = useState('INR');
  const [editInvoiceNo, setEditInvoiceNo] = useState('');
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editInvoiceDueDate, setEditInvoiceDueDate] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('Select Payment Method');
  const [editComments, setEditComments] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'Percent' | 'Amount'>('Percent');
  const [editDiscount, setEditDiscount] = useState('');
  const [editAdmissionFees, setEditAdmissionFees] = useState('');
  const [editPlanSelectorVisible, setEditPlanSelectorVisible] = useState(false);
  const [editPayMethodSelectorVisible, setEditPayMethodSelectorVisible] = useState(false);
  const [editInvoiceStatus, setEditInvoiceStatus] = useState<Invoice['status']>('pending');


  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('1995-01-01');
  const [planId, setPlanId] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [startDate, setStartDate] = useState(formatDate(new Date(), "yyyy-MM-dd"));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Expanded Add Member form states matching screen mocks
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNum, setPhoneNum] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [batch, setBatch] = useState('No Batch Found');
  const [joiningDate, setJoiningDate] = useState(formatDate(new Date(), "yyyy-MM-dd"));
  const [paymentDate, setPaymentDate] = useState(formatDate(new Date(), "yyyy-MM-dd"));
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Select Payment Method');
  const [discountType, setDiscountType] = useState<'Percent' | 'Amount'>('Percent');
  const [discount, setDiscount] = useState('');
  const [admissionFees, setAdmissionFees] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [comments, setComments] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Selector sheets visibility
  const [batchSelectorVisible, setBatchSelectorVisible] = useState(false);
  const [payMethodSelectorVisible, setPayMethodSelectorVisible] = useState(false);
  const [planSelectorVisible, setPlanSelectorVisible] = useState(false);

  // Detailed Renew Form states
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewStartDate, setRenewStartDate] = useState('');
  const [renewPaymentDate, setRenewPaymentDate] = useState('');
  const [renewPaidAmount, setRenewPaidAmount] = useState('');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('Select Payment Method');
  const [renewDiscountType, setRenewDiscountType] = useState<'Percent' | 'Amount'>('Percent');
  const [renewDiscount, setRenewDiscount] = useState('');
  const [renewAdmissionFees, setRenewAdmissionFees] = useState('');
  const [renewComments, setRenewComments] = useState('');

  // Selector sheets for renewal
  const [renewPlanSelectorVisible, setRenewPlanSelectorVisible] = useState(false);
  const [renewPayMethodSelectorVisible, setRenewPayMethodSelectorVisible] = useState(false);

  // Currency Selection
  const [selectedCurrency, setSelectedCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP' | null>(null);

  // Dropdowns lists
  const batchChoices = [
    "No Batch Found",
    "Morning Batch A (06:00 AM - 07:30 AM)",
    "Morning Batch B (08:00 AM - 09:30 AM)",
    "Evening Batch A (05:00 PM - 06:30 PM)",
    "Evening Batch B (07:00 PM - 08:30 PM)"
  ];
  const paymentMethods = ["Select Payment Method", "Cash", "UPI", "Card", "Bank Transfer"];

  const currentMember = useMemo(() => {
    if (!selectedMember) return null;
    return members.find(m => m.id === selectedMember.id) || selectedMember;
  }, [members, selectedMember]);

  // 1. Filter gym branch members
  const gymMembers = useMemo(() => members.filter(m => m.gymId === activeGymId), [members, activeGymId]);

  // 2. Advanced Status Filters
  const filteredMembers = useMemo(() => {
    return gymMembers.filter(member => {
      switch (activeFilter) {
        case 'active':
          return member.status === 'active';
        case 'inactive':
          return member.status === 'inactive';
        case 'unpaid':
          return (member.dueAmount ?? 0) > 0;
        case 'paid':
          return (member.dueAmount ?? 0) === 0;
        case 'expiring_1_3': {
          const diffTime = new Date(member.endDate).getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 3 && member.status === 'active';
        }
        case 'expiring_4_7': {
          const diffTime = new Date(member.endDate).getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 4 && diffDays <= 7 && member.status === 'active';
        }
        case 'expiring_8_15': {
          const diffTime = new Date(member.endDate).getTime() - new Date().getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 8 && diffDays <= 15 && member.status === 'active';
        }
        case 'birthday_today': {
          if (!member.dob) return false;
          const dobDate = parseISO(member.dob);
          const today = new Date();
          return dobDate.getMonth() === today.getMonth() && dobDate.getDate() === today.getDate();
        }
        case 'blocked':
          return member.status === 'blocked';
        case 'all':
        default:
          return true;
      }
    });
  }, [gymMembers, activeFilter]);

  // 3. Search query filtering (by name, phone, or membershipId)
  const searchedMembers = useMemo(() => {
    if (!searchQuery) return filteredMembers;
    const query = searchQuery.toLowerCase().trim();
    return filteredMembers.filter(member => {
      if (searchType === 'membershipId') {
        const mId = member.membershipId || member.id;
        return mId.toLowerCase().includes(query);
      } else if (searchType === 'mobile') {
        return member.phone.toLowerCase().includes(query);
      } else {
        return member.name.toLowerCase().includes(query);
      }
    });
  }, [filteredMembers, searchQuery, searchType]);

  // 4. Sorting logic
  const sortedMembers = useMemo(() => {
    const list = [...searchedMembers];
    return list.sort((a, b) => {
      switch (sortType) {
        case 'registered_oldest_newest':
          return new Date(a.joiningDate || a.startDate).getTime() - new Date(b.joiningDate || b.startDate).getTime();
        case 'alphabetical_az':
          return a.name.localeCompare(b.name);
        case 'alphabetical_za':
          return b.name.localeCompare(a.name);
        case 'due_amount_high_low':
          return (b.dueAmount ?? 0) - (a.dueAmount ?? 0);
        case 'registered_newest_oldest':
        default:
          return new Date(b.joiningDate || b.startDate).getTime() - new Date(a.joiningDate || a.startDate).getTime();
      }
    });
  }, [searchedMembers, sortType]);

  const getPlanName = (pId: string): string => {
    const plan = memberPlans.find(p => p.id === pId);
    return plan ? plan.name : "Custom Tier";
  };

  const getTrainerName = (tId?: string): string => {
    if (!tId) return "No assigned trainer";
    const trainer = trainers.find(t => t.id === tId);
    return trainer ? trainer.name : "No assigned trainer";
  };

  const isIdAvailable = useMemo(() => {
    if (!membershipId) return false;
    return !members.some(m => m.membershipId === membershipId || m.id === membershipId);
  }, [membershipId, members]);

  const selectedPlan = useMemo(() => memberPlans.find(p => p.id === planId), [planId, memberPlans]);
  const planPrice = selectedPlan ? selectedPlan.price : 0;
  const planCurrency = selectedPlan ? selectedPlan.currency || 'INR' : 'INR';

  const discountVal = useMemo(() => {
    const discNum = Number(discount) || 0;
    if (discountType === 'Percent') {
      return planPrice * discNum / 100;
    }
    return discNum;
  }, [discount, discountType, planPrice]);

  const totalCost = useMemo(() => {
    const fees = Number(admissionFees) || 0;
    return Math.max(0, planPrice + fees - discountVal);
  }, [planPrice, admissionFees, discountVal]);

  const dueAmount = useMemo(() => {
    const paid = Number(paidAmount) || 0;
    return Math.max(0, planPrice - paid);
  }, [planPrice, paidAmount]);

  // Real-time calculations for detailed Renew Form
  const renewPlan = useMemo(() => memberPlans.find(p => p.id === renewPlanId), [renewPlanId, memberPlans]);
  const renewPlanPrice = renewPlan ? renewPlan.price : 0;
  const renewPlanCurrency = renewPlan ? renewPlan.currency || 'INR' : 'INR';

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

  // Real-time calculations for Custom Manual Invoice Form
  const manualPlan = useMemo(() => memberPlans.find(p => p.id === manualPlanId), [manualPlanId, memberPlans]);
  const manualPlanPrice = manualPlan ? manualPlan.price : 0;
  const manualPlanCurrency = manualPlan ? manualPlan.currency || 'INR' : 'INR';

  const manualDiscountVal = useMemo(() => {
    const discNum = Number(manualDiscount) || 0;
    if (manualDiscountType === 'Percent') {
      return manualPlanPrice * discNum / 100;
    }
    return discNum;
  }, [manualDiscount, manualDiscountType, manualPlanPrice]);

  const manualTotalCost = useMemo(() => {
    const fees = Number(manualAdmissionFees) || 0;
    return Math.max(0, manualPlanPrice + fees - manualDiscountVal);
  }, [manualPlanPrice, manualAdmissionFees, manualDiscountVal]);

  const manualBalance = useMemo(() => {
    if (!manualInvoiceMember) {
      return {
        membershipAmount: 0,
        totalPaid: 0,
        remainingBalance: 0,
        maximumAllowedInvoiceAmount: 0,
        isFullyPaid: false,
        currency: 'INR' as const,
        plan: undefined
      };
    }

    const latestMember = members.find(m => m.id === manualInvoiceMember.id) || manualInvoiceMember;
    return calculateMembershipBalance(latestMember, invoices, memberPlans);
  }, [manualInvoiceMember, members, invoices, memberPlans]);

  const manualInvoiceAmount = useMemo(() => Number(manualPaidAmount) || 0, [manualPaidAmount]);

  const manualDueAmount = useMemo(() => {
    return Math.max(0, manualBalance.remainingBalance - (manualInvoiceStatus === 'paid' ? manualInvoiceAmount : 0));
  }, [manualBalance.remainingBalance, manualInvoiceAmount, manualInvoiceStatus]);

  // Real-time calculations for Edit Invoice Form
  const editPlan = useMemo(() => memberPlans.find(p => p.id === editPlanId), [editPlanId, memberPlans]);
  
  const editPlanPriceMemo = useMemo(() => {
    if (editPlan) return editPlan.price;
    return editPlanPrice;
  }, [editPlan, editPlanPrice]);

  const editPlanCurrencyMemo = useMemo<Invoice['currency']>(() => {
    if (editPlan) return editPlan.currency;
    return editPlanCurrency as Invoice['currency'];
  }, [editPlan, editPlanCurrency]);

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
    const paid = Number(editPaidAmount) || 0;
    return Math.max(0, editTotalCost - paid);
  }, [editTotalCost, editPaidAmount]);


  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.error("Media library permission is required to upload a profile photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUrl(result.assets[0].uri);
      }
    } catch (e) {
      toast.error("Failed to pick an image.");
    }
  };

  const handleOpenDetails = (member: Member) => {
    setSelectedMember(member);
    setDetailModalVisible(true);
  };

  const handleOpenAdd = () => {
    if (memberPlans.filter(p => p.gymId === activeGymId).length === 0) {
      toast.error("Please create a membership plan in Settings first!");
      return;
    }
    setName('');
    setEmail('');
    setPhone('');
    setPhoneNum('');
    setCountryCode('+91');
    setGender('Male');
    setDob('1995-01-01');
    setPlanId(memberPlans.filter(p => p.gymId === activeGymId)[0]?.id || '');
    setTrainerId('');
    setStartDate(formatDate(new Date(), "yyyy-MM-dd"));
    
    // Auto-resolve next membership ID
    const numericIds = members
      .map(m => Number(m.membershipId))
      .filter(id => !isNaN(id));
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : members.length + 1;
    setMembershipId(nextId.toString());

    setBatch('No Batch Found');
    setJoiningDate(formatDate(new Date(), "yyyy-MM-dd"));
    setPaymentDate(formatDate(new Date(), "yyyy-MM-dd"));
    setPaidAmount('');
    setPaymentMethod('Select Payment Method');
    setDiscount('');
    setDiscountType('Percent');
    setAdmissionFees('');
    setAddress('');
    setNotes('');
    setComments('');
    setPhotoUrl(null);

    setErrors({});
    setAddModalVisible(true);
  };

  const handleAddMember = async () => {
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(name)) tempErrors.name = "Full name is required.";
    if (!validateRequired(phoneNum)) tempErrors.phone = "Mobile number is required.";
    if (!validateRequired(membershipId)) tempErrors.membershipId = "Membership ID is required.";

    const idTaken = members.some(m => m.membershipId === membershipId || m.id === membershipId);
    if (idTaken) {
      tempErrors.membershipId = "This Membership ID is already taken.";
    }

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill all mandatory fields correctly.");
      return;
    }

    const plan = memberPlans.find(p => p.id === planId);
    if (!plan) return;

    const initialPaymentAmount = Number(paidAmount) || 0;
    if (initialPaymentAmount > plan.price) {
      toast.error("Invoice amount cannot exceed the remaining membership balance.");
      return;
    }

    const start = parseISO(joiningDate);
    const end = addDays(start, plan.durationDays).toISOString();

    const newMemberId = `member-${Date.now()}`;
    const newMember: Member = {
      id: newMemberId,
      name,
      email,
      phone: `${countryCode} ${phoneNum}`,
      dob,
      planId,
      startDate: start.toISOString(),
      endDate: end,
      status: 'active',
      assignedTrainerId: trainerId || undefined,
      gymId: activeGymId,
      bodyStatsLog: [
        { date: formatDate(new Date(), "yyyy-MM-dd"), weight: 75.0, height: 175, bmi: 24.5, chest: 38, waist: 32, hips: 36 }
      ],
      progressPhotos: [],
      gender,
      membershipId,
      batch,
      joiningDate,
      paymentDate,
      paidAmount: initialPaymentAmount,
      paymentMethod: paymentMethod !== 'Select Payment Method' ? paymentMethod : undefined,
      dueAmount,
      comments,
      discountType,
      discount: Number(discount) || 0,
      admissionFees: Number(admissionFees) || 0,
      address,
      notes,
      photoUrl: photoUrl || undefined
    };

    dispatch({ type: 'ADD_MEMBER', payload: newMember });

    if (initialPaymentAmount > 0) {
      dispatch({
        type: 'ADD_INVOICE',
        payload: {
          id: `inv-${Date.now()}-paid`,
          invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          memberId: newMemberId,
          memberName: name,
          planName: plan.name,
          amount: initialPaymentAmount,
          date: paymentDate,
          dueDate: paymentDate,
          status: 'paid',
          subtotal: initialPaymentAmount,
          tax: 0,
          addOns: 0,
          total: initialPaymentAmount,
          paidAmount: initialPaymentAmount,
          dueAmount: 0,
          gymId: activeGymId,
          currency: plan.currency || 'INR'
        }
      });
    }

    toast.success(`Member ${name} registered successfully!`);
    setAddModalVisible(false);
  };

  const handleOpenEdit = (member: Member) => {
    setSelectedMember(member);
    setName(member.name);
    setEmail(member.email);
    setPhone(member.phone);
    setDob(member.dob);
    setPlanId(member.planId);
    setTrainerId(member.assignedTrainerId || '');
    setErrors({});
    setDetailModalVisible(false);
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!selectedMember) return;
    const tempErrors: Record<string, string> = {};
    if (!validateRequired(name)) tempErrors.name = "Full name is required.";
    if (email && !validateEmail(email)) tempErrors.email = "Input valid email address.";
    if (!validateRequired(phone)) tempErrors.phone = "Phone number is required.";

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      toast.error("Please fill fields correctly.");
      return;
    }

    const updatedMember: Member = {
      ...selectedMember,
      name,
      email,
      phone,
      dob,
      planId,
      assignedTrainerId: trainerId || undefined
    };

    dispatch({ type: 'UPDATE_MEMBER', payload: updatedMember });
    toast.success("Member profile updated!");
    setEditModalVisible(false);
  };

  // Open Detailed Renew Modal matching screenshot
  const handleOpenRenew = (member: Member) => {
    setSelectedMember(member);
    setRenewPlanId(member.planId);
    
    // Start date defaults to the day after current expiry date
    const currentEnd = parseISO(member.endDate);
    const today = new Date();
    const startDateToUse = currentEnd > today ? currentEnd : today;
    setRenewStartDate(format(startDateToUse, "yyyy-MM-dd"));
    
    setRenewPaymentDate(format(new Date(), "yyyy-MM-dd"));
    
    const initialPlan = memberPlans.find(p => p.id === member.planId);
    setRenewPaidAmount(initialPlan ? initialPlan.price.toString() : '');
    
    setRenewPaymentMethod('Select Payment Method');
    setRenewDiscountType('Percent');
    setRenewDiscount('');
    setRenewAdmissionFees('');
    setRenewComments('');
    
    setDetailModalVisible(false);
    setRenewModalVisible(true);
  };

  const handleRenew = async () => {
    if (!selectedMember) return;
    const plan = memberPlans.find(p => p.id === renewPlanId);
    if (!plan) {
      toast.error("Please select a valid membership plan.");
      return;
    }

    const start = parseISO(renewStartDate);
    const end = addDays(start, plan.durationDays).toISOString();
    const renewalPaymentAmount = Number(renewPaidAmount) || 0;

    if (renewalPaymentAmount > plan.price) {
      toast.error("Invoice amount cannot exceed the remaining membership balance.");
      return;
    }

    const updatedMember: Member = {
      ...selectedMember,
      status: 'active',
      planId: renewPlanId,
      startDate: start.toISOString(),
      endDate: end,
      dueAmount: Math.max(0, plan.price - renewalPaymentAmount),
      paidAmount: renewalPaymentAmount,
      paymentMethod: renewPaymentMethod !== 'Select Payment Method' ? renewPaymentMethod : undefined,
      paymentDate: renewPaymentDate,
      comments: renewComments || selectedMember.comments
    };

    dispatch({ type: 'UPDATE_MEMBER', payload: updatedMember });

    if (renewalPaymentAmount > 0) {
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
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
        gymId: activeGymId,
        currency: plan.currency || 'INR'
      };
      dispatch({ type: 'ADD_INVOICE', payload: newInvoice });
    }

    toast.success(`Membership renewed successfully!`);
    setRenewModalVisible(false);
  };

  // Open Custom Manual Invoice creation modal inside member profile modal
  const handleOpenManualInvoice = (member: Member) => {
    const balance = calculateMembershipBalance(member, invoices, memberPlans);
    if (balance.isFullyPaid) {
      toast.warning("Membership payment completed. Please renew the membership plan to create a new invoice.");
      return;
    }

    setManualInvoiceMember(member);
    setManualPlanId(member.planId);
    setManualInvoiceNo(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setManualInvoiceDate(format(new Date(), "yyyy-MM-dd"));
    setManualInvoiceDueDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    setManualPaidAmount(balance.remainingBalance > 0 ? balance.remainingBalance.toString() : '');
    
    setManualPaymentMethod('Select Payment Method');
    setManualComments('');
    setManualDiscountType('Percent');
    setManualDiscount('');
    setManualAdmissionFees('');
    setManualInvoiceStatus('pending');
    
    setManualInvoiceModalVisible(true);
  };

  const handleCreateManualInvoice = () => {
    if (!manualInvoiceMember) return;
    const plan = memberPlans.find(p => p.id === manualPlanId);
    if (!plan) {
      toast.error("Please select a valid plan.");
      return;
    }

    const invoiceAmount = Number(manualPaidAmount) || 0;

    if (manualBalance.isFullyPaid) {
      toast.warning("Membership payment completed. Please renew the membership plan to create a new invoice.");
      return;
    }

    if (invoiceAmount <= 0) {
      toast.error("Please enter an invoice amount.");
      return;
    }

    if (invoiceAmount > manualBalance.remainingBalance) {
      toast.error("Invoice amount cannot exceed the remaining membership balance.");
      return;
    }

    const finalStatus = manualInvoiceStatus;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: manualInvoiceNo || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      memberId: manualInvoiceMember.id,
      memberName: manualInvoiceMember.name,
      planName: plan.name,
      amount: invoiceAmount,
      date: manualInvoiceDate,
      dueDate: manualInvoiceDueDate,
      status: finalStatus,
      subtotal: invoiceAmount,
      tax: 0,
      addOns: 0,
      total: invoiceAmount,
      paidAmount: finalStatus === 'paid' ? invoiceAmount : 0,
      dueAmount: finalStatus === 'paid' ? 0 : invoiceAmount,
      gymId: activeGymId,
      currency: plan.currency || 'INR'
    };

    dispatch({ type: 'ADD_INVOICE', payload: newInvoice });
    toast.success(`Invoice ${newInvoice.invoiceNo} issued!`);
    setManualInvoiceModalVisible(false);

    // Refresh details modal with latest member data
    const updatedMember = members.find(m => m.id === manualInvoiceMember.id);
    if (updatedMember) {
      setSelectedMember(updatedMember);
    }
    setDetailModalVisible(true);
  };

  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditInvoiceNo(inv.invoiceNo);
    setEditInvoiceDate(inv.date);
    setEditInvoiceDueDate(inv.dueDate);
    setEditInvoiceStatus(inv.status);
    
    const matchedPlan = memberPlans.find(p => p.name === inv.planName);
    if (matchedPlan) {
      setEditPlanId(matchedPlan.id);
      setEditPlanPrice(matchedPlan.price);
      setEditPlanCurrency(matchedPlan.currency || 'INR');
    } else {
      setEditPlanId('');
      setEditPlanPrice(inv.amount);
      setEditPlanCurrency(inv.currency || 'INR');
    }

    const calculatedDiscount = Math.max(0, inv.subtotal + inv.addOns - inv.total);
    setEditDiscount(calculatedDiscount > 0 ? calculatedDiscount.toString() : '');
    setEditDiscountType('Amount');
    setEditPaidAmount(inv.paidAmount?.toString() || '0');
    setEditAdmissionFees(inv.addOns.toString());
    setEditInvoiceModalVisible(true);
  };

  const handleSaveEditInvoice = () => {
    if (!editingInvoice) return;
    const plan = memberPlans.find(p => p.id === editPlanId);
    const planName = plan ? plan.name : editingInvoice.planName;

    const finalPaid = Number(editPaidAmount) || 0;
    const isFullyPaid = finalPaid >= editTotalCost;
    const finalStatus = isFullyPaid ? 'paid' : editInvoiceStatus;
    const finalDues = isFullyPaid ? 0 : editDueAmount;

    const updatedInvoice: Invoice = {
      ...editingInvoice,
      invoiceNo: editInvoiceNo || editingInvoice.invoiceNo,
      planName: planName,
      amount: editPlanPriceMemo,
      date: editInvoiceDate,
      dueDate: editInvoiceDueDate,
      status: finalStatus,
      subtotal: editPlanPriceMemo,
      tax: 0,
      addOns: Number(editAdmissionFees) || 0,
      total: editTotalCost,
      paidAmount: isFullyPaid ? editTotalCost : finalPaid,
      dueAmount: finalDues,
      currency: editPlanCurrencyMemo
    };

    dispatch({ type: 'UPDATE_INVOICE', payload: updatedInvoice });
    toast.success(`Invoice ${updatedInvoice.invoiceNo} updated successfully!`);
    setEditInvoiceModalVisible(false);

    // Refresh details modal with latest member data
    const updatedMember = members.find(m => m.id === editingInvoice.memberId);
    if (updatedMember) {
      setSelectedMember(updatedMember);
    }
    setDetailModalVisible(true);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this invoice? This action will permanently remove the record and recalculate the member's remaining dues.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            if (gymContext?.dispatch) {
              gymContext.dispatch({ type: 'DELETE_INVOICE', payload: invoiceId });
              toast.error("Invoice deleted successfully.");
              
              // Refresh details modal with latest member data
              setTimeout(() => {
                if (selectedMember) {
                  const updatedMember = gymContext.members.find(m => m.id === selectedMember.id);
                  if (updatedMember) {
                    setSelectedMember(updatedMember);
                  }
                }
              }, 300);
            }
          }
        }
      ]
    );
  };


  const handleFreeze = (memberId: string) => {
    dispatch({ type: 'MARK_MEMBER_INACTIVE', payload: memberId });
    toast.warning("Membership voluntarily frozen.");
    setDetailModalVisible(false);
  };

  const handleDelete = (memberId: string, memberName: string) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to delete ${memberName}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            dispatch({ type: 'DELETE_MEMBER', payload: memberId });
            toast.error("Member removed.");
            setDetailModalVisible(false);
          }
        }
      ]
    );
  };

  // Open Gym Pass Modal (Custom styled)
  const handleOpenIDCard = (member: Member) => {
    setIdCardMember(member);
    setPassStyle('modern');
    setIdCardModalVisible(true);
  };

  const handleCallMember = (phone: string) => {
    Linking.openURL(`tel:${phone.trim()}`).catch(() => {
      toast.error("Unable to launch phone dialer.");
    });
  };

  // Open WhatsApp template modal
  const handleOpenWhatsAppModal = (member: Member) => {
    setWhatsappMember(member);
    const templates = getWhatsAppTemplates(member);
    const defaultTemplate = (member.dueAmount && member.dueAmount > 0) ? templates[1] : templates[0];
    setWhatsappMessage(defaultTemplate.text);
    setWhatsappModalVisible(true);
  };

  // Helper function to build PDF invoice and share it directly (same as super admin panel)
  const handleSendInvoicePDF = async (member: Member, inv: Invoice) => {
    const gym = gyms.find(g => g.id === member.gymId) || gyms.find(g => g.id === activeGymId) || gyms[0];
    if (!gym) {
      toast.error("Gym settings not found.");
      return;
    }
    toast.info("Generating invoice PDF...");
    const res = await generateInvoicePDF(inv, gym, member);
    if (!res.success) {
      toast.error(res.error || "Failed to generate PDF.");
    }
  };


  // WhatsApp Templates builder
  const getWhatsAppTemplates = (member: Member) => {
    const plan = memberPlans.find(p => p.id === member.planId);
    const planName = plan ? plan.name : "Gym Membership";
    const dueAmt = member.dueAmount ?? 0;
    const paidAmt = member.paidAmount ?? 0;
    
    return [
      {
        id: 'confirm',
        name: 'Payment Confirmation',
        icon: 'checkmark-circle-outline',
        text: `Hi ${member.name}, we have received your payment of ${formatCurrency(paidAmt, 'INR')}. Thank you for choosing our gym! 💪`
      },
      {
        id: 'reminder',
        name: 'Payment Reminder',
        icon: 'alert-circle-outline',
        text: `Hi ${member.name}, this is a friendly reminder that your gym subscription has a due amount of ${formatCurrency(dueAmt, 'INR')}. Please settle it at your earliest convenience. Thank you!`
      },
      {
        id: 'expiry',
        name: 'Expiry Warning',
        icon: 'calendar-outline',
        text: `Hi ${member.name}, your membership plan (${planName}) is expiring on ${formatDate(member.endDate)}. Renew today to continue your fitness journey without interruption! 🏃‍♀️`
      },
      {
        id: 'welcome',
        name: 'Welcome Message',
        icon: 'person-add-outline',
        text: `Hi ${member.name}, welcome to our fitness club! We are excited to have you with us. Let's crush those fitness goals together! 🏋️`
      }
    ];
  };

  const handleSendWhatsApp = () => {
    if (!whatsappMember) return;
    const cleanPhone = whatsappMember.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(whatsappMessage);
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`)
      .then(() => {
        setWhatsappModalVisible(false);
      })
      .catch(() => {
        toast.error("Unable to open WhatsApp.");
      });
  };

  const handleLogAttendance = (member: Member) => {
    Alert.alert(
      "Log Attendance",
      `Would you like to manually log a check-in for ${member.name} today?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check-in",
          onPress: () => {
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const nowTimeStr = format(new Date(), "HH:mm");
            const newRecord: AttendanceRecord = {
              id: `att-${Date.now()}`,
              memberId: member.id,
              userName: member.name,
              role: 'member',
              gymId: member.gymId,
              date: todayStr,
              checkInTime: nowTimeStr,
              checkOutTime: null,
              status: 'checked_in',
              scannedBy: user?.name || 'Owner',
              method: 'manual'
            };
            dispatch({ type: 'LOG_ATTENDANCE', payload: newRecord });
            toast.success(`Check-in logged for ${member.name}`);
          }
        }
      ]
    );
  };

  const handleToggleBlockMember = (member: Member) => {
    const isBlocked = member.status === 'blocked';
    Alert.alert(
      isBlocked ? "Unblock Member" : "Block Member",
      `Are you sure you want to ${isBlocked ? 'unblock' : 'block'} ${member.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isBlocked ? "Unblock" : "Block",
          style: isBlocked ? "default" : "destructive",
          onPress: () => {
            const updatedMember: Member = {
              ...member,
              status: isBlocked ? 'active' : 'blocked'
            };
            dispatch({ type: 'UPDATE_MEMBER', payload: updatedMember });
            toast.success(`${member.name} is now ${isBlocked ? 'unblocked' : 'blocked'}.`);
          }
        }
      ]
    );
  };

  const handleToggleSearchType = () => {
    if (mIdSearchOnly) return;
    const nextType = searchType === 'name' ? 'mobile' : 'name';
    setSearchType(nextType);
    toast.info(`Searching by: ${nextType === 'name' ? 'Name' : 'Mobile Number'}`);
  };

  const handleMIdSwitchChange = (val: boolean) => {
    setMIdSearchOnly(val);
    if (val) {
      setSearchType('membershipId');
    } else {
      setSearchType('name');
    }
  };

  // CSV Export utility
  const handleExportCSV = async () => {
    try {
      let csvContent = "Member ID,Name,Email,Phone,DOB,Plan,Start Date,End Date,Status\n";
      gymMembers.forEach(m => {
        csvContent += `${m.id},"${m.name}",${m.email},${m.phone},${m.dob},"${getPlanName(m.planId)}",${formatDate(m.startDate)},${formatDate(m.endDate)},${m.status}\n`;
      });
      await Share.share({
        message: csvContent,
        title: "SetuGym Members Directory CSV"
      });
      toast.success("CSV file exported successfully!");
    } catch (e) {
      toast.error("Export failed.");
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  const handleChooseCurrency = () => {
    Alert.alert(
      "Choose Default Currency",
      "Select your preferred default currency mapping:",
      [
        { text: "INR (₹)", onPress: () => { setSelectedCurrency('INR'); toast.success("Currency set to INR (₹)"); } },
        { text: "USD ($)", onPress: () => { setSelectedCurrency('USD'); toast.success("Currency set to USD ($)"); } },
        { text: "EUR (€)", onPress: () => { setSelectedCurrency('EUR'); toast.success("Currency set to EUR (€)"); } },
        { text: "GBP (£)", onPress: () => { setSelectedCurrency('GBP'); toast.success("Currency set to GBP (£)"); } },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  // Helper local validators
  const validateRequired = (val: string) => val.trim().length > 0;
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  // Status Filter readable name mapping
  const filterNames: Record<FilterType, string> = {
    all: 'All',
    active: 'Active',
    inactive: 'Inactive',
    unpaid: 'Unpaid',
    paid: 'Paid',
    expiring_1_3: 'Expiring in 1-3 Days',
    expiring_4_7: 'Expiring in 4-7 Days',
    expiring_8_15: 'Expiring in 8-15 Days',
    birthday_today: 'Birthday Today',
    blocked: 'Blocked'
  };

  // Sort Filter readable name mapping
  const sortNames: Record<SortType, string> = {
    registered_newest_oldest: 'Member Registered: (Newest - Oldest)',
    registered_oldest_newest: 'Member Registered: (Oldest - Newest)',
    alphabetical_az: 'Alphabetical: A - Z',
    alphabetical_za: 'Alphabetical: Z - A',
    due_amount_high_low: 'Due Amount: High - Low'
  };

  // Retrieve current member gym name
  const getGymNameForMember = (member: Member): string => {
    const gym = gyms.find(g => g.id === member.gymId);
    return gym ? gym.name : "Fitness Center";
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} className="p-4">
      
      {/* Search Header Bar */}
      <View className="flex-row items-center gap-3 mb-4">
        {/* Modern text input container */}
        <View 
          style={{ 
            borderColor: colors.border, 
            borderWidth: 1, 
            backgroundColor: colors.card,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 24,
            paddingLeft: 12,
            paddingRight: 6,
            flex: 1,
            height: 48,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2
          }}
        >
          {/* Left indicator toggle icon */}
          <TouchableOpacity 
            onPress={handleToggleSearchType} 
            disabled={mIdSearchOnly}
            className="p-1 mr-2"
          >
            <Ionicons 
              name={
                searchType === 'membershipId' 
                  ? 'card' 
                  : searchType === 'mobile' 
                    ? 'phone-portrait-outline' 
                    : 'person-outline'
              } 
              size={18} 
              color={mIdSearchOnly ? colors.textSecondary : '#6C47FF'} 
            />
          </TouchableOpacity>

          <TextInput
            style={{ color: colors.text, flex: 1, fontSize: 13, paddingVertical: 0 }}
            placeholder={
              searchType === 'membershipId' 
                ? 'Search for "MembershipId"' 
                : searchType === 'mobile' 
                  ? 'Search for "Mobile"' 
                  : 'Search for "Name"'
            }
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Clean glass-like action button in text input */}
          <View 
            style={{ backgroundColor: '#6C47FF' }} 
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <Ionicons name="search-outline" size={14} color="#FFFFFF" />
          </View>
        </View>

        {/* Member ID Toggle Switch Panel */}
        <View className="items-center justify-center bg-card/40 px-2 py-1 rounded-xl border border-border/10 flex-col">
          <Text style={{ color: colors.textSecondary }} className="text-[8px] font-extrabold uppercase tracking-widest mb-0.5">M ID</Text>
          <Switch
            value={mIdSearchOnly}
            onValueChange={handleMIdSwitchChange}
            trackColor={{ false: '#767577', true: '#10B981' }}
            thumbColor={mIdSearchOnly ? '#FFFFFF' : '#f4f3f4'}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>

        {/* Export Action */}
        <TouchableOpacity
          onPress={handleExportCSV}
          style={{ backgroundColor: isDark ? 'rgba(108,71,255,0.15)' : 'rgba(108,71,255,0.08)' }}
          className="w-12 h-12 rounded-2xl items-center justify-center border border-primary/10 active:scale-95"
        >
          <Ionicons name="download-outline" size={20} color="#6C47FF" />
        </TouchableOpacity>
      </View>

      {/* Filter and Sort Pills */}
      <View className="flex-row items-center gap-3 mb-5">
        <TouchableOpacity 
          onPress={() => setStatusModalVisible(true)}
          style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }}
          className="flex-1 py-3 px-4 rounded-2xl flex-row items-center justify-between shadow-sm active:scale-98"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="funnel-outline" size={14} color="#6C47FF" />
            <Text 
              style={{ color: colors.text }} 
              className="text-xs font-bold" 
              numberOfLines={1}
            >
              Filter: {filterNames[activeFilter]}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setSortModalVisible(true)}
          style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }}
          className="flex-1 py-3 px-4 rounded-2xl flex-row items-center justify-between shadow-sm active:scale-98"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="swap-vertical-outline" size={14} color="#6C47FF" />
            <Text 
              style={{ color: colors.text }} 
              className="text-xs font-bold" 
              numberOfLines={1}
            >
              Sort: {sortNames[sortType].split(':')[0]}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Warning Currency Selection Banner */}
      {!selectedCurrency && (
        <View 
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.15)' }} 
          className="mb-4 p-3 rounded-2xl border flex-row justify-between items-center"
        >
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-base mr-2">💰</Text>
            <Text style={{ color: colors.text }} className="text-xs font-semibold">
              You haven't selected a currency yet.
            </Text>
          </View>
          <TouchableOpacity onPress={handleChooseCurrency}>
            <Text className="text-xs font-black text-amber-500 underline uppercase tracking-wider">Choose Currency</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Members flat list */}
      <FlatList
        data={sortedMembers}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <MemberCard
            member={item}
            planName={getPlanName(item.planId)}
            onPress={() => handleOpenDetails(item)}
            onEdit={() => handleOpenEdit(item)}
            onRenew={() => handleOpenRenew(item)}
            onDelete={() => handleDelete(item.id, item.name)}
            onBlock={() => handleToggleBlockMember(item)}
            onAttendance={() => handleLogAttendance(item)}
            onCall={() => handleCallMember(item.phone)}
            onWhatsApp={() => handleOpenWhatsAppModal(item)}
            onIDCard={() => handleOpenIDCard(item)}
          />
        )}
        ListEmptyComponent={
          <Card className="items-center py-12">
            <Text className="text-5xl mb-4">🏋️</Text>
            <Text style={{ color: colors.text }} className="text-lg font-black">No Members Found</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs text-center font-medium mt-1.5 leading-5 max-w-[240px]">
              We couldn't find any member matching the selected filter or search query.
            </Text>
          </Card>
        }
      />

      {/* Floating Add member FAB */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/(gym-owner)/add-staff-member', params: { initialRole: 'member' } })}
        style={{ 
          backgroundColor: '#6C47FF',
          shadowColor: '#6C47FF',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8 
        }}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center active:scale-95 flex-row"
      >
        <Ionicons name="person-add" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* STATUS SELECTOR BOTTOM SHEET MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }} 
            className="rounded-t-[32px] p-6 max-h-[75%] border-t"
          >
            <View className="items-center mb-6">
              <TouchableOpacity 
                onPress={() => setStatusModalVisible(false)}
                style={{ backgroundColor: colors.border }} 
                className="w-10 h-10 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ color: colors.text }} className="text-lg font-black mt-3">Filter Members Status</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(Object.keys(filterNames) as FilterType[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => {
                    setActiveFilter(f);
                    setStatusModalVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b flex-row justify-between items-center"
                >
                  <Text 
                    style={{ 
                      color: activeFilter === f ? '#6C47FF' : colors.text,
                      fontWeight: activeFilter === f ? 'bold' : 'normal' 
                    }} 
                    className="text-sm font-semibold"
                  >
                    {filterNames[f]}
                  </Text>
                  <Ionicons 
                    name={activeFilter === f ? "radio-button-on-outline" : "radio-button-off-outline"} 
                    size={20} 
                    color={activeFilter === f ? '#6C47FF' : colors.textSecondary} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SORT SELECTOR BOTTOM SHEET MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={sortModalVisible}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }} 
            className="rounded-t-[32px] p-6 max-h-[60%] border-t"
          >
            <View className="items-center mb-6">
              <TouchableOpacity 
                onPress={() => setSortModalVisible(false)}
                style={{ backgroundColor: colors.border }} 
                className="w-10 h-10 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ color: colors.text }} className="text-lg font-black mt-3">Sort Registry</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(Object.keys(sortNames) as SortType[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => {
                    setSortType(s);
                    setSortModalVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b flex-row justify-between items-center"
                >
                  <Text 
                    style={{ 
                      color: sortType === s ? '#6C47FF' : colors.text,
                      fontWeight: sortType === s ? 'bold' : 'normal' 
                    }} 
                    className="text-sm font-semibold"
                  >
                    {sortNames[s]}
                  </Text>
                  <Ionicons 
                    name={sortType === s ? "radio-button-on-outline" : "radio-button-off-outline"} 
                    size={20} 
                    color={sortType === s ? '#6C47FF' : colors.textSecondary} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* WHATSAPP CUSTOMIZER MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={whatsappModalVisible}
        onRequestClose={() => setWhatsappModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }} 
            className="rounded-t-[32px] p-6 max-h-[85%] border-t"
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
              <View className="flex-row items-center">
                <Ionicons name="logo-whatsapp" size={24} color="#10B981" className="mr-2" />
                <Text style={{ color: colors.text }} className="text-lg font-black">WhatsApp templates</Text>
              </View>
              <TouchableOpacity onPress={() => setWhatsappModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {whatsappMember && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mb-3">
                  Select a pre-defined message template for {whatsappMember.name}:
                </Text>

                {/* Templates Selector Carousel / Row */}
                <View className="flex-row flex-wrap gap-2.5 mb-5">
                  {getWhatsAppTemplates(whatsappMember).map((temp) => (
                    <TouchableOpacity
                      key={temp.id}
                      onPress={() => setWhatsappMessage(temp.text)}
                      style={{ 
                        borderColor: '#10B981',
                        borderWidth: 1.2,
                        backgroundColor: whatsappMessage === temp.text ? 'rgba(16,185,129,0.08)' : 'transparent'
                      }}
                      className="px-3.5 py-2 rounded-xl flex-row items-center gap-1.5"
                    >
                      <Ionicons name={temp.icon as any} size={14} color="#10B981" />
                      <Text style={{ color: colors.text }} className="text-[11px] font-extrabold uppercase tracking-wide">
                        {temp.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Editor Textbox */}
                <Text style={{ color: colors.text }} className="text-xs font-bold mb-2 pl-0.5">Customize message body:</Text>
                <View 
                  style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.background }} 
                  className="rounded-2xl p-3 mb-6 min-h-[110px]"
                >
                  <TextInput
                    style={{ color: colors.text, fontSize: 13, flex: 1, textAlignVertical: 'top' }}
                    multiline
                    numberOfLines={4}
                    value={whatsappMessage}
                    onChangeText={setWhatsappMessage}
                    placeholder="Enter custom message to send..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Actions */}
                <Button 
                  title="Send via WhatsApp" 
                  onPress={handleSendWhatsApp} 
                  style={{ backgroundColor: '#10B981' }} 
                  className="rounded-xl py-3.5"
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* GYM PASS DRILLDOWN MODAL (Matches user screenshot) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={idCardModalVisible}
        onRequestClose={() => setIdCardModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View 
            style={{ backgroundColor: colors.card, borderColor: colors.border }} 
            className="rounded-t-[32px] p-6 border-t"
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-1" />
              <Text style={{ color: colors.text }} className="text-lg font-black text-center flex-1">Gym Pass</Text>
              <TouchableOpacity onPress={() => setIdCardModalVisible(false)} className="flex-1 items-end p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {idCardMember && (
              <View className="items-center">
                
                {/* Switcher Tab bar */}
                <View style={{ backgroundColor: isDark ? '#1C1C2E' : '#F3F4F6', padding: 4 }} className="flex-row rounded-xl mb-6 w-full max-w-[320px]">
                  {(['modern', 'classic', 'bold'] as const).map((style) => (
                    <TouchableOpacity
                      key={style}
                      onPress={() => setPassStyle(style)}
                      style={{
                        backgroundColor: passStyle === style ? colors.card : 'transparent',
                        shadowColor: passStyle === style ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: passStyle === style ? 2 : 0,
                      }}
                      className="flex-1 py-2 rounded-lg items-center"
                    >
                      <Text 
                        style={{ 
                          color: passStyle === style ? colors.text : colors.textSecondary,
                          fontWeight: passStyle === style ? 'bold' : 'normal' 
                        }} 
                        className="text-xs capitalize"
                      >
                        {style}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* DYNAMIC CARD VIEW */}
                {passStyle === 'modern' && (
                  <View 
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 24,
                      width: '100%',
                      maxWidth: 320,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.1,
                      shadowRadius: 20,
                      elevation: 6,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      overflow: 'hidden',
                      marginBottom: 24
                    }}
                  >
                    {/* Modern Top Teal Banner */}
                    <View style={{ backgroundColor: '#008080' }} className="p-4 flex-row justify-between items-center">
                      <View className="flex-1 mr-2">
                        <Text className="text-white font-extrabold text-sm uppercase tracking-wider">
                          {getGymNameForMember(idCardMember)}
                        </Text>
                        <Text className="text-white/80 text-[10px] font-semibold mt-0.5">
                          {idCardMember.name.split(' ')[0]} ({idCardMember.phone.replace(/[^0-9+]/g, '')})
                        </Text>
                      </View>
                      <View className="w-9 h-9 rounded-full bg-white items-center justify-center shadow">
                        <Ionicons name="people" size={16} color="#008080" />
                      </View>
                    </View>

                    {/* Modern Card Body */}
                    <View className="p-5">
                      {/* Avatar and Name */}
                      <View className="flex-row items-center mb-5">
                        <View className="w-12 h-12 rounded-full border border-gray-200 overflow-hidden items-center justify-center bg-gray-50">
                          {idCardMember.photoUrl ? (
                            <Image source={{ uri: idCardMember.photoUrl }} className="w-full h-full" />
                          ) : (
                            <Ionicons name="person" size={24} color="#9CA3AF" />
                          )}
                        </View>
                        <View className="ml-3 flex-1">
                          <Text style={{ color: '#0F0F1A' }} className="text-base font-extrabold">
                            {idCardMember.name}
                          </Text>
                          <Text style={{ color: '#6B7280' }} className="text-xs font-semibold">
                            ID: {idCardMember.membershipId || idCardMember.id}
                          </Text>
                        </View>
                      </View>

                      {/* Details row layout matching screenshot */}
                      <View className="space-y-3">
                        <View className="flex-row justify-between items-center border-b border-gray-100 pb-2">
                          <Text style={{ color: '#6B7280' }} className="text-[10px] font-bold uppercase tracking-wider">PLAN</Text>
                          <Text style={{ color: '#0F0F1A' }} className="text-xs font-bold">{getPlanName(idCardMember.planId)}</Text>
                        </View>
                        <View className="flex-row justify-between items-center pt-1">
                          <View>
                            <Text style={{ color: '#6B7280' }} className="text-[10px] font-bold uppercase tracking-wider">START</Text>
                            <Text style={{ color: '#0F0F1A' }} className="text-xs font-semibold mt-0.5">{formatDate(idCardMember.startDate)}</Text>
                          </View>
                          <View className="items-end">
                            <Text style={{ color: '#6B7280' }} className="text-[10px] font-bold uppercase tracking-wider">EXPIRY</Text>
                            <Text style={{ color: '#0F0F1A' }} className="text-xs font-semibold mt-0.5">{formatDate(idCardMember.endDate)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {passStyle === 'classic' && (
                  <View 
                    style={{
                      backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF',
                      borderRadius: 24,
                      width: '100%',
                      maxWidth: 320,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.1,
                      shadowRadius: 20,
                      elevation: 6,
                      borderWidth: 2,
                      borderColor: '#B45309', // Amber border
                      padding: 20,
                      marginBottom: 24
                    }}
                  >
                    <Text style={{ color: '#B45309' }} className="text-center font-black text-sm uppercase tracking-widest mb-1">
                      {getGymNameForMember(idCardMember)}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-[9px] font-semibold text-center mb-4 uppercase tracking-widest">
                      Classic Gym Pass
                    </Text>

                    <View className="items-center mb-4">
                      <View style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 16 }} className="shadow">
                        <QRCode
                          value={`setugym://member/${idCardMember.id}`}
                          size={100}
                          color="#000000"
                          backgroundColor="#FFFFFF"
                        />
                      </View>
                    </View>

                    <View className="space-y-2.5">
                      <View className="flex-row justify-between border-b border-amber-900/10 pb-1.5">
                        <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">MEMBER</Text>
                        <Text style={{ color: colors.text }} className="text-xs font-bold">{idCardMember.name}</Text>
                      </View>
                      <View className="flex-row justify-between border-b border-amber-900/10 pb-1.5">
                        <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">M ID</Text>
                        <Text style={{ color: colors.text }} className="text-xs font-bold">{idCardMember.membershipId || idCardMember.id}</Text>
                      </View>
                      <View className="flex-row justify-between pt-1">
                        <Text style={{ color: colors.textSecondary }} className="text-[10px] font-bold uppercase tracking-wider">EXPIRY DATE</Text>
                        <Text style={{ color: '#B45309' }} className="text-xs font-bold">{formatDate(idCardMember.endDate)}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {passStyle === 'bold' && (
                  <View 
                    style={{
                      borderRadius: 24,
                      width: '100%',
                      maxWidth: 320,
                      shadowColor: '#6C47FF',
                      shadowOffset: { width: 0, height: 12 },
                      shadowOpacity: 0.2,
                      shadowRadius: 24,
                      elevation: 8,
                      overflow: 'hidden',
                      marginBottom: 24
                    }}
                  >
                    <View style={{ backgroundColor: '#1E1B4B', padding: 20 }} className="relative">
                      <View style={{ backgroundColor: '#6C47FF', width: 150, height: 150, borderRadius: 75, opacity: 0.15, position: 'absolute', top: -50, right: -50 }} />
                      <View style={{ backgroundColor: '#00C896', width: 120, height: 120, borderRadius: 60, opacity: 0.1, position: 'absolute', bottom: -40, left: -40 }} />

                      <View className="flex-row justify-between items-start mb-6">
                        <View>
                          <Text className="text-white font-black text-base uppercase tracking-wider">
                            {getGymNameForMember(idCardMember).split(' ')[0]} PRO
                          </Text>
                          <Text className="text-emerald-400 text-[9px] font-extrabold uppercase tracking-widest mt-0.5">
                            VIP ACCESS PASS
                          </Text>
                        </View>
                        <Ionicons name="flash" size={24} color="#00C896" />
                      </View>

                      <View className="flex-row items-center mb-6">
                        <View style={{ borderColor: '#6C47FF', borderWidth: 2 }} className="w-14 h-14 rounded-full overflow-hidden items-center justify-center bg-indigo-950 p-0.5">
                          {idCardMember.photoUrl ? (
                            <Image source={{ uri: idCardMember.photoUrl }} className="w-full h-full rounded-full" />
                          ) : (
                            <Ionicons name="person" size={28} color="#6C47FF" />
                          )}
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-white text-base font-black tracking-wide">
                            {idCardMember.name}
                          </Text>
                          <Text className="text-indigo-300 text-xs font-bold">
                            M ID: {idCardMember.membershipId || idCardMember.id}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row justify-between items-center bg-indigo-950/60 p-3.5 rounded-2xl border border-indigo-500/20">
                        <View>
                          <Text className="text-indigo-300 text-[8px] font-black uppercase tracking-widest">EXPIRES ON</Text>
                          <Text className="text-white text-xs font-black mt-0.5">{formatDate(idCardMember.endDate)}</Text>
                        </View>
                        <View className="w-px h-8 bg-indigo-500/20" />
                        <View className="items-end">
                          <Text className="text-indigo-300 text-[8px] font-black uppercase tracking-widest">ACTIVE TIER</Text>
                          <Text className="text-emerald-400 text-xs font-black mt-0.5">{getPlanName(idCardMember.planId).split(' ')[0]}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Primary Teal Share Button */}
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const msg = `Gym Pass Details:\nGym: ${getGymNameForMember(idCardMember)}\nMember: ${idCardMember.name}\nMember ID: ${idCardMember.membershipId || idCardMember.id}\nPlan: ${getPlanName(idCardMember.planId)}\nExpiry: ${formatDate(idCardMember.endDate)}`;
                      await Share.share({
                        message: msg,
                        title: `${idCardMember.name} Gym Pass`
                      });
                    } catch (e) {
                      toast.error("Sharing failed.");
                    }
                  }}
                  style={{ backgroundColor: '#008080' }}
                  className="w-full max-w-[320px] py-3.5 rounded-xl flex-row items-center justify-center gap-2 mb-4 active:scale-98"
                >
                  <Ionicons name="share-social" size={16} color="#FFFFFF" />
                  <Text className="text-white font-extrabold text-sm">Share</Text>
                </TouchableOpacity>

                {/* Share Old Pass Text Link */}
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const oldMsg = `SetuGym global registry pass:\nID: ${idCardMember.id}\nName: ${idCardMember.name}\nPlan: ${getPlanName(idCardMember.planId)}\nStart Date: ${formatDate(idCardMember.startDate)}\nExpiry Date: ${formatDate(idCardMember.endDate)}`;
                      await Share.share({
                        message: oldMsg,
                        title: "Old Gym Registry Pass"
                      });
                    } catch (e) {
                      toast.error("Sharing old pass failed.");
                    }
                  }}
                  className="py-2 mb-2"
                >
                  <Text style={{ color: colors.textSecondary }} className="text-xs underline font-semibold">
                    Share Old Pass
                  </Text>
                </TouchableOpacity>

              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* RENEW PLAN FULL-SCREEN MODAL (Matches user screenshot) */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={renewModalVisible}
        onRequestClose={() => setRenewModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{ backgroundColor: '#005C5C', height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => setRenewModalVisible(false)} className="p-1">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-lg ml-4">Renew Plan</Text>
          </View>

          {selectedMember && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              
              {/* Select Gym Plan Dropdown */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Select Gym Plan</Text>
                <TouchableOpacity 
                  onPress={() => setRenewPlanSelectorVisible(true)} 
                  style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }} 
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="document-text-outline" size={18} color="#008080" className="mr-3" />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">
                      {renewPlanId ? `${getPlanName(renewPlanId)} (${renewPlanPrice})` : "Select Gym Plan"}
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
                label="Plan Start Date *"
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

              {/* Admission Fees */}
              <Input
                label="Admission Fees"
                placeholder="Admission Fees"
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
          setDetailModalVisible(true);
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{ backgroundColor: '#005C5C', height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => {
              setManualInvoiceModalVisible(false);
              setDetailModalVisible(true);
            }} className="p-1">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-lg ml-4">Create Invoice</Text>
          </View>

          {manualInvoiceMember && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              
              {/* Select Plan */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Select Gym Plan</Text>
                <TouchableOpacity 
                  onPress={() => setManualPlanSelectorVisible(true)} 
                  style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }} 
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="document-text-outline" size={18} color="#008080" className="mr-3" />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">
                      {manualPlanId ? `${getPlanName(manualPlanId)} (${manualPlanPrice})` : "Select Gym Plan"}
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
                placeholder={`Enter up to ${formatCurrency(manualBalance.remainingBalance, manualPlanCurrency)}`}
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

              {/* Admission Fees */}
              <Input
                label="Admission Fees"
                placeholder="Admission Fees"
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
          setDetailModalVisible(true);
        }}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View style={{ backgroundColor: '#005C5C', height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={() => {
              setEditInvoiceModalVisible(false);
              setDetailModalVisible(true);
            }} className="p-1">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-extrabold text-lg ml-4">Edit Invoice</Text>
          </View>

          {editingInvoice && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              
              {/* Select Plan */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Select Gym Plan *</Text>
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
                label="Paid Amount"
                placeholder="Enter paid amount"
                value={editPaidAmount}
                onChangeText={setEditPaidAmount}
                keyboardType="numeric"
                icon="cash-outline"
              />

              {/* Payment Method Selector */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Payment Method</Text>
                <TouchableOpacity 
                  onPress={() => setEditPayMethodSelectorVisible(true)} 
                  style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.card }} 
                  className="flex-row items-center justify-between px-4 py-3.5 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="card-outline" size={18} color="#008080" className="mr-3" />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">{editPaymentMethod}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

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
                      statusVal === 'overdue' ? '#DC2626' : '#F59E0B';
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

              {/* Discount in Plan Section */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mb-2">Discount in Plan:</Text>
                
                {/* Ratio Toggles */}
                <View className="flex-row gap-6 mb-3 items-center">
                  <Ionicons name="funnel-outline" size={18} color="#008080" className="mr-0.5" />
                  <TouchableOpacity onPress={() => setEditDiscountType('Percent')} className="flex-row items-center">
                    <Ionicons 
                      name={editDiscountType === 'Percent' ? "radio-button-on" : "radio-button-off"} 
                      size={18} 
                      color={editDiscountType === 'Percent' ? '#008080' : colors.textSecondary} 
                    />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Percent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditDiscountType('Amount')} className="flex-row items-center">
                    <Ionicons 
                      name={editDiscountType === 'Amount' ? "radio-button-on" : "radio-button-off"} 
                      size={18} 
                      color={editDiscountType === 'Amount' ? '#008080' : colors.textSecondary} 
                    />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Amount</Text>
                  </TouchableOpacity>
                </View>

                <Input
                  placeholder={editDiscountType === 'Percent' ? "Discount Percent (%)" : "Discount Amount"}
                  value={editDiscount}
                  onChangeText={setEditDiscount}
                  keyboardType="numeric"
                  icon="pricetag-outline"
                />
              </View>

              {/* Admission Fees */}
              <Input
                label="Admission Fees"
                placeholder="Admission Fees"
                value={editAdmissionFees}
                onChangeText={setEditAdmissionFees}
                keyboardType="numeric"
                icon="barbell-outline"
              />

              {/* Save Button */}
              <Button
                title="Save Changes"
                onPress={handleSaveEditInvoice}
                style={{ backgroundColor: '#005C5C', height: 48 }}
                className="rounded-xl mt-6 mb-8"
              />

            </ScrollView>
          )}
        </View>
      </Modal>

      {/* EDIT INVOICE PLAN SELECTOR SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editPlanSelectorVisible}
        onRequestClose={() => setEditPlanSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Gym Plan</Text>
              <TouchableOpacity onPress={() => setEditPlanSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {memberPlans.filter(p => p.gymId === activeGymId).map((pChoice) => (
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
                    {formatCurrency(pChoice.price, pChoice.currency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT INVOICE PAYMENT METHOD SELECTOR SHEET */}
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

      {/* MANUAL INVOICE PLAN SELECTOR SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={manualPlanSelectorVisible}
        onRequestClose={() => setManualPlanSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Gym Plan</Text>
              <TouchableOpacity onPress={() => setManualPlanSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {memberPlans.filter(p => p.gymId === activeGymId).map((pChoice) => (
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
                    {formatCurrency(pChoice.price, pChoice.currency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MANUAL INVOICE PAYMENT METHOD SELECTOR SHEET */}
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
              <Text style={{ color: colors.text }} className="text-base font-black">Select Gym Plan</Text>
              <TouchableOpacity onPress={() => setRenewPlanSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {memberPlans.filter(p => p.gymId === activeGymId).map((pChoice) => (
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
                    {formatCurrency(pChoice.price, pChoice.currency)}
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

      {/* DETAIL MODAL DRILLDOWN */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[85%] border-t border-gray-100 dark:border-gray-800">
            {currentMember && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center mb-5">
                  <Text style={{ color: colors.text }} className="text-xl font-black">
                    Member profile
                  </Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="p-1">
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Profile header */}
                <View className="items-center mb-6">
                  <Avatar name={currentMember.name} uri={currentMember.photoUrl} size={64} />
                  <Text style={{ color: colors.text }} className="text-lg font-black mt-3">
                    {currentMember.name}
                  </Text>
                  <Badge status={currentMember.status} style={{ marginTop: 6 }} />
                </View>

                {/* Detail Blocks */}
                <View className="space-y-3.5 mb-6">
                  {currentMember.membershipId ? (
                    <View className="flex-row justify-between">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Membership ID</Text>
                      <Text style={{ color: colors.text }} className="text-xs font-bold">{currentMember.membershipId}</Text>
                    </View>
                  ) : null}
                  {currentMember.gender ? (
                    <View className="flex-row justify-between mt-2">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Gender</Text>
                      <Text style={{ color: colors.text }} className="text-xs font-bold">{currentMember.gender}</Text>
                    </View>
                  ) : null}
                  {currentMember.batch ? (
                    <View className="flex-row justify-between mt-2">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Batch / Class</Text>
                      <Text style={{ color: colors.text }} className="text-xs font-semibold">{currentMember.batch}</Text>
                    </View>
                  ) : null}
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Email address</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{currentMember.email || 'N/A'}</Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Phone number</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{currentMember.phone}</Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">DOB</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-semibold">{currentMember.dob ? formatDate(currentMember.dob) : 'N/A'}</Text>
                  </View>
                  {currentMember.address ? (
                    <View className="flex-row justify-between mt-2">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Address</Text>
                      <Text style={{ color: colors.text }} className="text-xs font-semibold">{currentMember.address}</Text>
                    </View>
                  ) : null}
                  {currentMember.notes ? (
                    <View className="flex-row justify-between mt-2">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Notes</Text>
                      <Text style={{ color: colors.text }} className="text-xs font-semibold">{currentMember.notes}</Text>
                    </View>
                  ) : null}
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Membership Plan</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{getPlanName(currentMember.planId)}</Text>
                  </View>
                  {(() => {
                    const balance = calculateMembershipBalance(currentMember, invoices, memberPlans);
                    return (
                      <>
                        <View className="flex-row justify-between mt-2">
                          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Total Paid</Text>
                          <Text style={{ color: '#00C896' }} className="text-xs font-bold">
                            {formatCurrency(balance.totalPaid, balance.currency)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between mt-2">
                          <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Remaining Balance</Text>
                          <Text style={{ color: balance.remainingBalance > 0 ? '#FF6B35' : '#00C896' }} className="text-xs font-bold">
                            {formatCurrency(balance.remainingBalance, balance.currency)}
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Assigned Trainer</Text>
                    <Text style={{ color: colors.text }} className="text-xs font-bold">{getTrainerName(currentMember.assignedTrainerId)}</Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">Start / Expiry Date</Text>
                    <Text style={{ color: colors.text }} className="text-[11px] font-bold">
                      {formatDate(currentMember.startDate)} to {formatDate(currentMember.endDate)}
                    </Text>
                  </View>
                </View>

                {/* History panels lists with Manual Create action */}
                <View className="flex-row justify-between items-center mb-3">
                  <Text style={{ color: colors.text }} className="text-sm font-black">Invoice History</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if ((currentMember.dueAmount ?? 0) <= 0) {
                        toast.warning("Membership payment completed. Please renew the membership plan to create a new invoice.");
                        return;
                      }
                      setDetailModalVisible(false);
                      handleOpenManualInvoice(currentMember);
                    }}
                    style={{ 
                      backgroundColor: (currentMember.dueAmount ?? 0) <= 0 
                        ? 'rgba(156, 163, 175, 0.08)' 
                        : 'rgba(0, 128, 128, 0.08)',
                      borderColor: (currentMember.dueAmount ?? 0) <= 0
                        ? 'rgba(156, 163, 175, 0.15)'
                        : 'rgba(0, 128, 128, 0.15)'
                    }}
                    className="px-2.5 py-1 rounded-lg border"
                  >
                    <Text 
                      style={{ 
                        color: (currentMember.dueAmount ?? 0) <= 0 
                          ? '#9CA3AF' 
                          : '#008080' 
                      }} 
                      className="font-bold text-[10px] uppercase"
                    >
                      + Create Invoice
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="mb-6 space-y-2">
                  {invoices.filter(i => i.memberId === currentMember.id).length === 0 ? (
                    <Card className="items-center py-4 bg-gray-50/50 dark:bg-gray-800/10">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No transactions recorded.</Text>
                    </Card>
                  ) : (
                    invoices.filter(i => i.memberId === currentMember.id).map(i => (
                      <View key={i.id} className="flex-row justify-between bg-gray-50/50 dark:bg-gray-800/20 p-2.5 rounded-lg items-center">
                        <View className="flex-1">
                          <Text style={{ color: colors.text }} className="text-xs font-bold">{i.invoiceNo}</Text>
                          <Text style={{ color: colors.textSecondary }} className="text-[9px] mt-0.5">{formatDate(i.date)}</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-primary font-black text-xs">{formatCurrency(i.total, i.currency)}</Text>
                          <Badge status={i.status} style={{ paddingVertical: 1, paddingHorizontal: 6 }} />
                          <TouchableOpacity
                            onPress={() => handleSendInvoicePDF(currentMember, i)}
                            className="p-1 bg-emerald-500/10 rounded-full ml-1"
                          >
                            <Ionicons name="logo-whatsapp" size={14} color="#10B981" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleSendInvoicePDF(currentMember, i)}
                            className="p-1 bg-primary/10 rounded-full ml-1"
                          >
                            <Ionicons name="document-text" size={14} color="#6C47FF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setDetailModalVisible(false);
                              handleOpenEditInvoice(i);
                            }}
                            className="p-1 bg-blue-500/10 rounded-full ml-1"
                          >
                            <Ionicons name="pencil" size={14} color="#3B82F6" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteInvoice(i.id)}
                            className="p-1 bg-red-500/10 rounded-full ml-1"
                          >
                            <Ionicons name="trash-outline" size={14} color="#FF6B35" />
                          </TouchableOpacity>


                        </View>
                      </View>
                    ))
                  )}
                </View>

                <Text style={{ color: colors.text }} className="text-sm font-black mb-3">Attendance History (Past 5 Checks)</Text>
                <View className="mb-6 space-y-2">
                  {attendanceRecords.filter(r => r.memberId === currentMember.id).slice(0, 5).length === 0 ? (
                    <Card className="items-center py-4 bg-gray-50/50 dark:bg-gray-800/10">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold">No attendance logged yet.</Text>
                    </Card>
                  ) : (
                    attendanceRecords.filter(r => r.memberId === currentMember.id).slice(0, 5).map(r => (
                      <View key={r.id} className="flex-row justify-between bg-gray-50/50 dark:bg-gray-800/20 p-2.5 rounded-lg">
                        <Text style={{ color: colors.text }} className="text-xs font-semibold">{formatDate(r.date, "PP")}</Text>
                        <Text style={{ color: colors.textSecondary }} className="text-xs">{r.checkInTime} ({r.method})</Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Operations grid */}
                <Text style={{ color: colors.text }} className="text-sm font-black mb-3">Operator Actions</Text>
                <View className="flex-row flex-wrap justify-between gap-3 mb-6">
                  <TouchableOpacity
                    onPress={() => handleOpenEdit(currentMember)}
                    className="w-[48%] py-3.5 bg-primary rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs uppercase tracking-wide">Edit Profile</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenRenew(currentMember)}
                    className="w-[48%] py-3.5 bg-secondary rounded-xl items-center"
                  >
                    <Text className="text-white font-bold text-xs uppercase tracking-wide">Renew Plan</Text>
                  </TouchableOpacity>

                  {currentMember.status === 'active' && (
                    <TouchableOpacity
                      onPress={() => handleFreeze(currentMember.id)}
                      className="w-[48%] py-3.5 bg-accent rounded-xl items-center"
                    >
                      <Text className="text-white font-bold text-xs uppercase tracking-wide">Freeze Account</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => handleDelete(currentMember.id, currentMember.name)}
                    className="w-[48%] py-3.5 border border-red-500 rounded-xl items-center"
                  >
                    <Text className="text-red-500 font-bold text-xs uppercase tracking-wide">Remove Member</Text>
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
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[92%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-5 border-b pb-3 border-gray-100 dark:border-gray-800">
              <View className="flex-row items-center">
                <Ionicons name="person-add-outline" size={22} color="#6C47FF" className="mr-2" />
                <Text style={{ color: colors.text }} className="text-xl font-black">
                  Add Member
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Photo Picker */}
              <View className="items-center mb-6 relative">
                <TouchableOpacity onPress={handlePickPhoto} className="relative">
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={{ width: 85, height: 85, borderRadius: 42.5 }} className="bg-gray-200 border border-gray-300" />
                  ) : (
                    <View style={{ backgroundColor: 'rgba(108, 71, 255, 0.08)', borderColor: '#6C47FF' }} className="w-[85px] h-[85px] rounded-full items-center justify-center border border-dashed">
                      <Ionicons name="person" size={40} color="#6C47FF" />
                    </View>
                  )}
                  <View className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white dark:border-gray-900 shadow">
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Name */}
              <Input
                label="Name *"
                placeholder="Enter member name"
                value={name}
                onChangeText={setName}
                error={errors.name}
                icon="person-outline"
              />

              {/* Gender Radio options */}
              <View className="mb-4 pl-0.5">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2">Gender</Text>
                <View className="flex-row gap-6">
                  <TouchableOpacity onPress={() => setGender('Male')} className="flex-row items-center">
                    <Ionicons name={gender === 'Male' ? "radio-button-on" : "radio-button-off"} size={18} color={gender === 'Male' ? '#6C47FF' : colors.textSecondary} />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setGender('Female')} className="flex-row items-center">
                    <Ionicons name={gender === 'Female' ? "radio-button-on" : "radio-button-off"} size={18} color={gender === 'Female' ? '#6C47FF' : colors.textSecondary} />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Female</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mobile Phone Number with Country Code */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Mobile Number *</Text>
                <View className="flex-row gap-2">
                  <View style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.background }} className="flex-row items-center px-3 py-3 rounded-xl">
                    <Text className="text-base mr-1">🇮🇳</Text>
                    <Text style={{ color: colors.text }} className="text-sm font-semibold mr-1">+91</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                  </View>
                  <View style={{ borderColor: errors.phone ? colors.accent : colors.border, borderWidth: 1, backgroundColor: colors.background, flex: 1 }} className="flex-row items-center px-4 py-3 rounded-xl">
                    <TextInput
                      style={{ color: colors.text, flex: 1, fontSize: 14, paddingVertical: 0 }}
                      placeholder="Enter mobile number"
                      placeholderTextColor={colors.textSecondary}
                      value={phoneNum}
                      onChangeText={setPhoneNum}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                {errors.phone ? (
                  <Text style={{ color: colors.accent }} className="text-[10px] font-medium mt-1 pl-1">
                    {errors.phone}
                  </Text>
                ) : null}
              </View>

              {/* Membership ID */}
              <View className="mb-4">
                <Input
                  label="Membership ID *"
                  placeholder="Enter membership ID"
                  value={membershipId}
                  onChangeText={setMembershipId}
                  error={errors.membershipId}
                  icon="card-outline"
                />
                {membershipId && !errors.membershipId ? (
                  <Text style={{ color: isIdAvailable ? '#00C896' : colors.accent }} className="text-[10px] font-semibold mt-[-8px] mb-2 pl-1.5">
                    {isIdAvailable ? "✓ Membership ID is available" : "✗ Membership ID is already taken"}
                  </Text>
                ) : null}
              </View>

              {/* Batch / Group Class Selection */}
              <View className="mb-4">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Batch / Group Class</Text>
                <TouchableOpacity onPress={() => setBatchSelectorVisible(true)} style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.background }} className="flex-row items-center justify-between px-4 py-3 rounded-xl">
                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={18} color="#6C47FF" className="mr-2" />
                    <Text style={{ color: colors.text }} className="text-sm font-semibold">{batch}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Plan Details section */}
              <View className="mt-4 mb-6 border-t pt-4 border-gray-100 dark:border-gray-800">
                <Text style={{ color: colors.text }} className="text-base font-black mb-4">
                  Plan Details
                </Text>

                {/* Select Gym Plan */}
                <View className="mb-4">
                  <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Select Gym Plan</Text>
                  <TouchableOpacity onPress={() => setPlanSelectorVisible(true)} style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.background }} className="flex-row items-center justify-between px-4 py-3 rounded-xl">
                    <View className="flex-row items-center">
                      <Ionicons name="document-text-outline" size={18} color="#00C896" className="mr-2" />
                      <Text style={{ color: colors.text }} className="text-sm font-semibold">
                        {planId ? `${getPlanName(planId)} (${formatCurrency(planPrice, planCurrency)})` : "Select Gym Plan"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Plan Amount Display */}
                <View className="mb-4 pl-0.5">
                  <Text style={{ color: colors.text }} className="text-sm font-bold">
                    Plan Amount: {formatCurrency(planPrice, planCurrency)}
                  </Text>
                </View>

                {/* Select Joining Date */}
                <Input
                  label="Select Joining Date"
                  placeholder="e.g. 2026-06-08"
                  value={joiningDate}
                  onChangeText={setJoiningDate}
                  icon="calendar-outline"
                  isDatePicker={true}
                />

                {/* Payment Date */}
                <Input
                  label="Payment Date"
                  placeholder="e.g. 2026-06-08"
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                  icon="calendar-outline"
                  isDatePicker={true}
                />

                {/* Paid Amount */}
                <Input
                  label="Paid Amount"
                  placeholder="Enter paid amount"
                  value={paidAmount}
                  onChangeText={setPaidAmount}
                  keyboardType="numeric"
                  icon="cash-outline"
                />

                {/* Payment Method */}
                <View className="mb-4">
                  <Text style={{ color: colors.text }} className="text-xs font-semibold mb-1.5 pl-0.5">Payment Method</Text>
                  <TouchableOpacity onPress={() => setPayMethodSelectorVisible(true)} style={{ borderColor: colors.border, borderWidth: 1, backgroundColor: colors.background }} className="flex-row items-center justify-between px-4 py-3 rounded-xl">
                    <View className="flex-row items-center">
                      <Ionicons name="wallet-outline" size={18} color="#FF6B35" className="mr-2" />
                      <Text style={{ color: colors.text }} className="text-sm font-semibold">{paymentMethod}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Due Amount Display */}
                <View className="mb-4 pl-0.5">
                  <Text style={{ color: colors.text }} className="text-sm font-bold">
                    Due Amount: {formatCurrency(dueAmount, planCurrency)}
                  </Text>
                </View>

                {/* Comments */}
                <Input
                  label="Comments"
                  placeholder="Enter comments"
                  value={comments}
                  onChangeText={setComments}
                  icon="chatbubble-ellipses-outline"
                />

                {/* Discount type toggle */}
                <View className="mb-4 pl-0.5">
                  <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mb-2">Discount in Plan:</Text>
                  <View className="flex-row gap-6 mb-3">
                    <TouchableOpacity onPress={() => setDiscountType('Percent')} className="flex-row items-center">
                      <Ionicons name={discountType === 'Percent' ? "radio-button-on" : "radio-button-off"} size={18} color={discountType === 'Percent' ? '#6C47FF' : colors.textSecondary} />
                      <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Percent (%)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDiscountType('Amount')} className="flex-row items-center">
                      <Ionicons name={discountType === 'Amount' ? "radio-button-on" : "radio-button-off"} size={18} color={discountType === 'Amount' ? '#6C47FF' : colors.textSecondary} />
                      <Text style={{ color: colors.text }} className="text-sm font-semibold ml-1.5">Amount</Text>
                    </TouchableOpacity>
                  </View>
                  <Input
                    placeholder={discountType === 'Percent' ? "Enter discount percent" : "Enter discount amount"}
                    value={discount}
                    onChangeText={setDiscount}
                    keyboardType="numeric"
                    icon="pricetag-outline"
                  />
                </View>

                {/* Admission Fees */}
                <Input
                  label="Admission Fees"
                  placeholder="Enter admission fees"
                  value={admissionFees}
                  onChangeText={setAdmissionFees}
                  keyboardType="numeric"
                  icon="barbell-outline"
                />
              </View>

              {/* Member Details section */}
              <View className="mb-6 border-t pt-4 border-gray-100 dark:border-gray-800">
                <Text style={{ color: colors.text }} className="text-base font-black mb-4">
                  Member Details
                </Text>

                {/* Email */}
                <Input
                  label="Email"
                  placeholder="Enter email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                />

                {/* Date of Birth */}
                <Input
                  label="Date of Birth"
                  placeholder="e.g. 1996-04-18"
                  value={dob}
                  onChangeText={setDob}
                  icon="calendar-outline"
                  isDatePicker={true}
                />

                {/* Address */}
                <Input
                  label="Address"
                  placeholder="Enter address"
                  value={address}
                  onChangeText={setAddress}
                  icon="home-outline"
                />

                {/* Notes */}
                <Input
                  label="Notes"
                  placeholder="Enter notes"
                  value={notes}
                  onChangeText={setNotes}
                  icon="create-outline"
                />
              </View>

              {/* Trainer Assignment */}
              <View className="mb-6 border-t pt-4 border-gray-100 dark:border-gray-800">
                <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Assign Fitness Trainer</Text>
                <View className="flex-row flex-wrap gap-2">
                  <TouchableOpacity
                    onPress={() => setTrainerId('')}
                    style={{
                      borderColor: trainerId === '' ? '#6C47FF' : colors.border,
                      backgroundColor: trainerId === '' ? 'rgba(108,71,255,0.08)' : 'transparent'
                    }}
                    className="px-3 py-2 border rounded-xl"
                  >
                    <Text style={{ color: trainerId === '' ? '#6C47FF' : colors.text }} className="text-xs font-bold">
                      No Trainer
                    </Text>
                  </TouchableOpacity>

                  {trainers.filter(t => t.gymId === activeGymId).map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setTrainerId(t.id)}
                      style={{
                        borderColor: trainerId === t.id ? '#6C47FF' : colors.border,
                        backgroundColor: trainerId === t.id ? 'rgba(108,71,255,0.08)' : 'transparent'
                      }}
                      className="px-3 py-2 border rounded-xl"
                    >
                      <Text style={{ color: trainerId === t.id ? '#6C47FF' : colors.text }} className="text-xs font-bold">
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button
                title="Save Member"
                onPress={handleAddMember}
                className="rounded-xl mb-6 py-3.5"
                style={{ backgroundColor: '#6C47FF' }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BATCH SELECTOR SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={batchSelectorVisible}
        onRequestClose={() => setBatchSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Batch / Group Class</Text>
              <TouchableOpacity onPress={() => setBatchSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {batchChoices.map((bChoice) => (
                <TouchableOpacity
                  key={bChoice}
                  onPress={() => {
                    setBatch(bChoice);
                    setBatchSelectorVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{bChoice}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PLAN SELECTOR SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={planSelectorVisible}
        onRequestClose={() => setPlanSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Gym Plan</Text>
              <TouchableOpacity onPress={() => setPlanSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {memberPlans.filter(p => p.gymId === activeGymId).map((pChoice) => (
                <TouchableOpacity
                  key={pChoice.id}
                  onPress={() => {
                    setPlanId(pChoice.id);
                    setPlanSelectorVisible(false);
                  }}
                  style={{ borderBottomColor: colors.border }}
                  className="py-3.5 border-b flex-row justify-between items-center"
                >
                  <Text style={{ color: colors.text }} className="text-sm font-semibold">{pChoice.name}</Text>
                  <Text style={{ color: '#00C896' }} className="text-xs font-black">
                    {formatCurrency(pChoice.price, pChoice.currency)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PAYMENT METHOD SELECTOR SHEET */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={payMethodSelectorVisible}
        onRequestClose={() => setPayMethodSelectorVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-[32px] p-6 max-h-[50%] border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
              <Text style={{ color: colors.text }} className="text-base font-black">Select Payment Method</Text>
              <TouchableOpacity onPress={() => setPayMethodSelectorVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {paymentMethods.map((mChoice) => (
                <TouchableOpacity
                  key={mChoice}
                  onPress={() => {
                    setPaymentMethod(mChoice);
                    setPayMethodSelectorVisible(false);
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

      {/* EDIT MODAL FORM */}
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
                Edit Member Details
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} className="p-1">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                error={errors.name}
                icon="person-outline"
              />

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                icon="mail-outline"
              />

              <Input
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
                keyboardType="phone-pad"
                icon="call-outline"
              />

              <Input
                label="Date of Birth"
                value={dob}
                onChangeText={setDob}
                error={errors.dob}
                icon="calendar-outline"
                isDatePicker={true}
              />

              <Text style={{ color: colors.text }} className="text-xs font-semibold mb-2 ml-0.5">Assign Trainer</Text>
              <View className="mb-6 flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setTrainerId('')}
                  style={{
                    borderColor: trainerId === '' ? '#6C47FF' : colors.border,
                    backgroundColor: trainerId === '' ? 'rgba(108,71,255,0.08)' : 'transparent'
                  }}
                  className="px-3 py-2 border rounded-xl"
                >
                  <Text style={{ color: trainerId === '' ? '#6C47FF' : colors.text }} className="text-xs font-bold">
                    No Trainer
                  </Text>
                </TouchableOpacity>

                {trainers.filter(t => t.gymId === activeGymId).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setTrainerId(t.id)}
                    style={{
                      borderColor: trainerId === t.id ? '#6C47FF' : colors.border,
                      backgroundColor: trainerId === t.id ? 'rgba(108,71,255,0.08)' : 'transparent'
                    }}
                    className="px-3 py-2 border rounded-xl"
                  >
                    <Text style={{ color: trainerId === t.id ? '#6C47FF' : colors.text }} className="text-xs font-bold">
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="Save Profile Updates"
                onPress={handleSaveEdit}
                className="rounded-xl mb-6"
                style={{ backgroundColor: '#6C47FF' }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
