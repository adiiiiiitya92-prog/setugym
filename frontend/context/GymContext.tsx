import React, { createContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GymState, Gym, GymOwner, SubscriptionPlan, Member, Trainer, AttendanceRecord, Invoice, MemberPlan, Notice, AppNotification, BodyStat, Enquiry, Expense, Feedback, PlanUpgradeRequest, DietPlan, WorkoutPlan } from '../types';
import { 
  MOCK_GYMS, 
  MOCK_OWNERS, 
  MOCK_SUBSCRIPTION_PLANS, 
  MOCK_MEMBERS, 
  MOCK_TRAINERS, 
  MOCK_ATTENDANCE, 
  MOCK_INVOICES, 
  MOCK_MEMBER_PLANS, 
  MOCK_NOTICES,
  MOCK_DIET_PLANS,
  MOCK_WORKOUT_PLANS,
  MOCK_ENQUIRIES,
  MOCK_EXPENSES,
  MOCK_FEEDBACKS,
  MOCK_PLAN_UPGRADE_REQUESTS
} from '../constants/mockData';
import { addDays, parseISO, format } from 'date-fns';
import { calculateMembershipBalance, calculateOwnerSubscriptionBalance } from '../utils/membershipBalance';
import { supabase } from '../utils/supabase';

// Local cache for mapping mock text IDs to valid database UUIDs
const uuidCache: Record<string, string> = {
  'gym-fitzone-1': '8f8f8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f',
  'gym-fitzone-2': '8f8f8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f',
  'mplan-fit-monthly': 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
  'mplan-fit-quarterly': 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
  'mplan-fit-annual': 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'
};

/**
 * Resolves any mock string ID to a valid UUID format deterministically.
 */
function resolveId(id: string | null | undefined): string {
  if (!id) return '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  if (uuidCache[id]) {
    return uuidCache[id];
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padEnd(32, 'a');
  const formatted = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-a${hex.slice(15, 18)}-${hex.slice(18, 30)}`;
  uuidCache[id] = formatted;
  return formatted;
}

/**
 * Helper to wrap any async promise or Supabase builder with a timeout limit so background operations never hang.
 */
function withTimeout<T = any>(promise: any, ms: number = 3500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
  ]);
}

/**
 * Smart merge utility: updates existing records and appends new ones from remote,
 * but NEVER deletes locally created items if remote doesn't have them yet.
 */
function mergeById<T extends { id: string }>(currentList: T[], remoteList?: T[]): T[] {
  if (!remoteList || remoteList.length === 0) {
    return currentList;
  }
  const map = new Map<string, T>();
  currentList.forEach(item => map.set(item.id, item));
  remoteList.forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}

type GymAction =
  // Owners / Gyms
  | { type: 'ADD_OWNER'; payload: { owner: GymOwner; gym: Gym } }
  | { type: 'ADD_GYM_BRANCH'; payload: Gym }
  | { type: 'SUSPEND_OWNER'; payload: string }
  | { type: 'APPROVE_OWNER'; payload: string }
  | { type: 'EXTEND_TRIAL'; payload: string }
  | { type: 'DELETE_OWNER'; payload: string }
  | { type: 'UPDATE_OWNER_PLAN'; payload: { ownerId: string; planId: string } }
  | { type: 'RENEW_OWNER'; payload: { ownerId: string; planId: string; endDate: string } }
  | { type: 'UPDATE_OWNER'; payload: GymOwner }
  // Subscription plans
  | { type: 'ADD_SUB_PLAN'; payload: SubscriptionPlan }
  | { type: 'UPDATE_SUB_PLAN'; payload: SubscriptionPlan }
  | { type: 'DELETE_SUB_PLAN'; payload: string }
  | { type: 'TOGGLE_SUB_PLAN'; payload: string }
  // Members
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'UPDATE_MEMBER'; payload: Member }
  | { type: 'RENEW_MEMBER'; payload: { memberId: string; planId: string; endDate: string } }
  | { type: 'MARK_MEMBER_INACTIVE'; payload: string }
  | { type: 'DELETE_MEMBER'; payload: string }
  | { type: 'RECORD_BODY_STATS'; payload: { memberId: string; stat: BodyStat } }
  // Trainers
  | { type: 'ADD_TRAINER'; payload: Trainer }
  | { type: 'UPDATE_TRAINER'; payload: Trainer }
  | { type: 'DELETE_TRAINER'; payload: string }
  | { type: 'ASSIGN_TRAINER'; payload: { memberId: string; trainerId: string } }
  // Membership plans
  | { type: 'ADD_MEMBER_PLAN'; payload: MemberPlan }
  | { type: 'UPDATE_MEMBER_PLAN'; payload: MemberPlan }
  | { type: 'DELETE_MEMBER_PLAN'; payload: string }
  // Notices
  | { type: 'ADD_NOTICE'; payload: Notice }
  | { type: 'DELETE_NOTICE'; payload: string }
  // Notifications
  | { type: 'ADD_NOTIFICATION'; payload: AppNotification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'LOAD_STATE'; payload: any }
  // Invoices
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'UPDATE_INVOICE_STATUS'; payload: { invoiceId: string; status: 'paid' | 'pending' | 'overdue' | 'failed' } }
  | { type: 'UPDATE_INVOICE'; payload: Invoice }
  | { type: 'DELETE_INVOICE'; payload: string }
  // Attendance
  | { type: 'LOG_ATTENDANCE'; payload: AttendanceRecord }
  | { type: 'UPDATE_ATTENDANCE'; payload: AttendanceRecord }
  // Diets & Workouts
  | { type: 'ADD_DIET'; payload: DietPlan }
  | { type: 'ASSIGN_DIET'; payload: { memberId: string; dietId: string } }
  | { type: 'ADD_WORKOUT'; payload: WorkoutPlan }
  | { type: 'ASSIGN_WORKOUT'; payload: { memberId: string; workoutId: string } }
  // Settings
  | { type: 'UPDATE_GYM_INFO'; payload: { gymId: string; name: string; addressLine1: string; addressLine2?: string; city: string; state: string; pin: string; phone: string; email: string; logoUrl?: string; gstNumber?: string; website?: string } }
  | { type: 'UPDATE_PLATFORM_SETTINGS'; payload: GymState['settings'] }
  | { type: 'TOGGLE_GYM_FEATURE'; payload: { gymId: string; featureKey: string } }
  // Enquiries
  | { type: 'ADD_ENQUIRY'; payload: Enquiry }
  | { type: 'DELETE_ENQUIRY'; payload: string }
  // Expenses
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  // Feedback
  | { type: 'ADD_FEEDBACK'; payload: Feedback }
  // Plan Upgrade Requests
  | { type: 'CREATE_PLAN_UPGRADE_REQUEST'; payload: PlanUpgradeRequest }
  | { type: 'APPROVE_PLAN_UPGRADE_REQUEST'; payload: string }
  | { type: 'REJECT_PLAN_UPGRADE_REQUEST'; payload: string };

function updateMemberDuesFromInvoices(members: Member[], invoices: Invoice[], memberPlans: MemberPlan[], memberId: string): Member[] {
  const memberIndex = members.findIndex(m => m.id === memberId);
  if (memberIndex === -1) return members;
  const member = members[memberIndex];
  const balance = calculateMembershipBalance(member, invoices, memberPlans);

  return members.map(m => m.id === memberId ? {
    ...m,
    paidAmount: balance.totalPaid,
    dueAmount: balance.remainingBalance
  } : m);
}

function updateAllMemberDues(members: Member[], invoices: Invoice[], memberPlans: MemberPlan[]): Member[] {
  return members.map(member => {
    const balance = calculateMembershipBalance(member, invoices, memberPlans);
    return {
      ...member,
      paidAmount: balance.totalPaid,
      dueAmount: balance.remainingBalance
    };
  });
}

function updateOwnerDuesFromInvoices(owners: GymOwner[], invoices: Invoice[], subscriptionPlans: SubscriptionPlan[], ownerId: string): GymOwner[] {
  const ownerIndex = owners.findIndex(o => o.id === ownerId);
  if (ownerIndex === -1) return owners;
  const owner = owners[ownerIndex];
  const balance = calculateOwnerSubscriptionBalance(owner, invoices, subscriptionPlans);

  return owners.map(o => o.id === ownerId ? {
    ...o,
    paidAmount: balance.totalPaid,
    dueAmount: balance.remainingBalance
  } : o);
}

function updateAllOwnerDues(owners: GymOwner[], invoices: Invoice[], subscriptionPlans: SubscriptionPlan[]): GymOwner[] {
  return owners.map(owner => {
    const balance = calculateOwnerSubscriptionBalance(owner, invoices, subscriptionPlans);
    return {
      ...owner,
      paidAmount: balance.totalPaid,
      dueAmount: balance.remainingBalance
    };
  });
}

const initialState: GymState & { dietPlans: DietPlan[]; workoutPlans: WorkoutPlan[] } = {
  gyms: MOCK_GYMS,
  owners: updateAllOwnerDues(MOCK_OWNERS, MOCK_INVOICES, MOCK_SUBSCRIPTION_PLANS),
  subscriptionPlans: MOCK_SUBSCRIPTION_PLANS,
  members: updateAllMemberDues(MOCK_MEMBERS, MOCK_INVOICES, MOCK_MEMBER_PLANS),
  trainers: MOCK_TRAINERS,
  attendanceRecords: MOCK_ATTENDANCE,
  invoices: MOCK_INVOICES,
  memberPlans: MOCK_MEMBER_PLANS,
  notices: MOCK_NOTICES,
  notifications: [
    {
      id: 'notif-mock-1',
      title: 'Gym Upgrade Complete!',
      body: 'We have successfully upgraded all treadmill equipment in the main workout cardio section. Check it out today!',
      audience: 'everyone',
      read: false,
      priority: 'normal',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'notif-mock-2',
      title: 'Urgent: Maintenance Today',
      body: 'The sauna room will be closed for routine deep cleaning on Wednesday.',
      audience: 'members',
      read: true,
      priority: 'urgent',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    }
  ],
  enquiries: MOCK_ENQUIRIES,
  expenses: MOCK_EXPENSES,
  feedbacks: MOCK_FEEDBACKS,
  dietPlans: MOCK_DIET_PLANS,
  workoutPlans: MOCK_WORKOUT_PLANS,
  settings: {
    appName: "SetuGym Platform",
    supportEmail: "platform-support@setugym.com",
    trialDurationDays: 7,
    paymentGatewayActive: true
  },
  planUpgradeRequests: MOCK_PLAN_UPGRADE_REQUESTS
};

function gymReducer(state: typeof initialState, action: GymAction): typeof initialState {
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...state,
        ...action.payload
      };

    case 'ADD_OWNER':
      return {
        ...state,
        owners: [action.payload.owner, ...state.owners],
        gyms: [action.payload.gym, ...state.gyms]
      };
    case 'ADD_GYM_BRANCH': {
      const newGym = action.payload;
      return {
        ...state,
        gyms: [newGym, ...state.gyms],
        owners: state.owners.map(o => {
          if (o.id === newGym.ownerId) {
            return {
              ...o,
              gymIds: o.gymIds.includes(newGym.id) ? o.gymIds : [...o.gymIds, newGym.id]
            };
          }
          return o;
        })
      };
    }
    case 'SUSPEND_OWNER':
      return {
        ...state,
        owners: state.owners.map(o => o.id === action.payload ? { ...o, status: 'suspended' } : o)
      };
    case 'APPROVE_OWNER':
      return {
        ...state,
        owners: state.owners.map(o => o.id === action.payload ? { ...o, status: 'active' } : o)
      };
    case 'EXTEND_TRIAL':
      return {
        ...state,
        owners: state.owners.map(o => {
          if (o.id === action.payload) {
            const currentTrialStart = parseISO(o.trialStartDate);
            const newTrialStart = addDays(currentTrialStart, 7).toISOString();
            return {
              ...o,
              status: 'trial',
              trialStartDate: newTrialStart,
              trialDaysRemaining: o.trialDaysRemaining + 7
            };
          }
          return o;
        })
      };
    case 'DELETE_OWNER':
      return {
        ...state,
        owners: state.owners.filter(o => o.id !== action.payload),
        gyms: state.gyms.filter(g => g.ownerId !== action.payload)
      };
    case 'UPDATE_OWNER_PLAN':
      return {
        ...state,
        owners: state.owners.map(o => o.id === action.payload.ownerId ? { ...o, status: 'active', planId: action.payload.planId } : o)
      };
    case 'RENEW_OWNER':
      return {
        ...state,
        owners: state.owners.map(o => o.id === action.payload.ownerId ? {
          ...o,
          status: 'active',
          planId: action.payload.planId,
          endDate: action.payload.endDate,
          startDate: new Date().toISOString()
        } : o)
      };
    case 'UPDATE_OWNER':
      return {
        ...state,
        owners: state.owners.map(o => o.id === action.payload.id ? action.payload : o)
      };
    
    // Sub plans
    case 'ADD_SUB_PLAN':
      return { ...state, subscriptionPlans: [action.payload, ...state.subscriptionPlans] };
    case 'UPDATE_SUB_PLAN':
      return {
        ...state,
        subscriptionPlans: state.subscriptionPlans.map(p => p.id === action.payload.id ? action.payload : p)
      };
    case 'DELETE_SUB_PLAN':
      return { ...state, subscriptionPlans: state.subscriptionPlans.filter(p => p.id !== action.payload) };
    case 'TOGGLE_SUB_PLAN':
      return {
        ...state,
        subscriptionPlans: state.subscriptionPlans.map(p => p.id === action.payload ? { ...p, isActive: !p.isActive } : p)
      };

    // Members
    case 'ADD_MEMBER': {
      const newMember = action.payload;
      return {
        ...state,
        members: [newMember, ...state.members],
        trainers: newMember.assignedTrainerId
          ? state.trainers.map(t =>
              t.id === newMember.assignedTrainerId
                ? { ...t, memberIds: t.memberIds.includes(newMember.id) ? t.memberIds : [...t.memberIds, newMember.id] }
                : t
            )
          : state.trainers
      };
    }
    case 'UPDATE_MEMBER': {
      const updatedMember = action.payload;
      const oldMember = state.members.find(m => m.id === updatedMember.id);
      const oldTrainerId = oldMember?.assignedTrainerId;
      const newTrainerId = updatedMember.assignedTrainerId;

      return {
        ...state,
        members: state.members.map(m => m.id === updatedMember.id ? updatedMember : m),
        trainers: state.trainers.map(t => {
          let nextMemberIds = t.memberIds;
          if (oldTrainerId !== newTrainerId) {
            if (t.id === oldTrainerId) {
              nextMemberIds = nextMemberIds.filter(id => id !== updatedMember.id);
            }
            if (t.id === newTrainerId) {
              nextMemberIds = nextMemberIds.includes(updatedMember.id)
                ? nextMemberIds
                : [...nextMemberIds, updatedMember.id];
            }
          }
          return { ...t, memberIds: nextMemberIds };
        })
      };
    }
    case 'RENEW_MEMBER':
      return {
        ...state,
        members: state.members.map(m => m.id === action.payload.memberId ? {
          ...m,
          status: 'active',
          planId: action.payload.planId,
          endDate: action.payload.endDate
        } : m)
      };
    case 'MARK_MEMBER_INACTIVE':
      return {
        ...state,
        members: state.members.map(m => m.id === action.payload ? { ...m, status: 'inactive' } : m)
      };
    case 'DELETE_MEMBER':
      return {
        ...state,
        members: state.members.filter(m => m.id !== action.payload),
        trainers: state.trainers.map(t => ({
          ...t,
          memberIds: t.memberIds.filter(id => id !== action.payload)
        }))
      };
    case 'RECORD_BODY_STATS':
      return {
        ...state,
        members: state.members.map(m => m.id === action.payload.memberId ? {
          ...m,
          bodyStatsLog: [action.payload.stat, ...m.bodyStatsLog]
        } : m)
      };

    // Trainers
    case 'ADD_TRAINER':
      return { ...state, trainers: [action.payload, ...state.trainers] };
    case 'UPDATE_TRAINER':
      return {
        ...state,
        trainers: state.trainers.map(t => t.id === action.payload.id ? action.payload : t)
      };
    case 'ASSIGN_TRAINER':
      return {
        ...state,
        members: state.members.map(m => m.id === action.payload.memberId ? { ...m, assignedTrainerId: action.payload.trainerId } : m),
        trainers: state.trainers.map(t => {
          if (t.id === action.payload.trainerId) {
            return {
              ...t,
              memberIds: t.memberIds.includes(action.payload.memberId) ? t.memberIds : [...t.memberIds, action.payload.memberId]
            };
          }
          return t;
        })
      };
    case 'DELETE_TRAINER':
      return {
        ...state,
        trainers: state.trainers.filter(t => t.id !== action.payload)
      };

    // Member Plans
    case 'ADD_MEMBER_PLAN':
      return { ...state, memberPlans: [action.payload, ...state.memberPlans] };
    case 'UPDATE_MEMBER_PLAN':
      return {
        ...state,
        memberPlans: state.memberPlans.map(p => p.id === action.payload.id ? action.payload : p)
      };
    case 'DELETE_MEMBER_PLAN':
      return { ...state, memberPlans: state.memberPlans.filter(p => p.id !== action.payload) };

    // Notices
    case 'ADD_NOTICE':
      return { ...state, notices: [action.payload, ...state.notices] };
    case 'DELETE_NOTICE':
      return { ...state, notices: state.notices.filter(n => n.id !== action.payload) };

    // Notifications
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n)
      };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      };
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    // Invoices
    case 'ADD_INVOICE': {
      const nextInvoices = [action.payload, ...state.invoices];
      const nextMembers = updateMemberDuesFromInvoices(state.members, nextInvoices, state.memberPlans, action.payload.memberId);
      const nextOwners = updateOwnerDuesFromInvoices(state.owners, nextInvoices, state.subscriptionPlans, action.payload.memberId);
      return { ...state, invoices: nextInvoices, members: nextMembers, owners: nextOwners };
    }
    case 'UPDATE_INVOICE_STATUS': {
      const nextInvoices = state.invoices.map(i => i.id === action.payload.invoiceId ? { ...i, status: action.payload.status } : i);
      const targetInvoice = state.invoices.find(i => i.id === action.payload.invoiceId);
      if (!targetInvoice) return { ...state, invoices: nextInvoices };

      const nextMembers = updateMemberDuesFromInvoices(state.members, nextInvoices, state.memberPlans, targetInvoice.memberId);
      const nextOwners = updateOwnerDuesFromInvoices(state.owners, nextInvoices, state.subscriptionPlans, targetInvoice.memberId);
      return { ...state, invoices: nextInvoices, members: nextMembers, owners: nextOwners };
    }
    case 'UPDATE_INVOICE': {
      const invoice = action.payload;
      const nextInvoices = state.invoices.map(i => i.id === invoice.id ? invoice : i);
      const nextMembers = updateMemberDuesFromInvoices(state.members, nextInvoices, state.memberPlans, invoice.memberId);
      const nextOwners = updateOwnerDuesFromInvoices(state.owners, nextInvoices, state.subscriptionPlans, invoice.memberId);
      return { ...state, invoices: nextInvoices, members: nextMembers, owners: nextOwners };
    }
    case 'DELETE_INVOICE': {
      const invoice = state.invoices.find(i => i.id === action.payload);
      if (!invoice) return state;
      const nextInvoices = state.invoices.filter(i => i.id !== action.payload);
      const nextMembers = updateMemberDuesFromInvoices(state.members, nextInvoices, state.memberPlans, invoice.memberId);
      const nextOwners = updateOwnerDuesFromInvoices(state.owners, nextInvoices, state.subscriptionPlans, invoice.memberId);
      return { ...state, invoices: nextInvoices, members: nextMembers, owners: nextOwners };
    }

    // Attendance
    case 'LOG_ATTENDANCE':
      return { ...state, attendanceRecords: [action.payload, ...state.attendanceRecords] };
    case 'UPDATE_ATTENDANCE':
      return {
        ...state,
        attendanceRecords: state.attendanceRecords.map(r => r.id === action.payload.id ? action.payload : r)
      };

    // Diets & Workouts
    case 'ADD_DIET':
      return {
        ...state,
        dietPlans: [action.payload, ...state.dietPlans]
      };
    case 'ASSIGN_DIET':
      return {
        ...state,
        dietPlans: state.dietPlans.map(d => d.id === action.payload.dietId ? { ...d, assignedMemberId: action.payload.memberId } : d)
      };
    case 'ADD_WORKOUT':
      return {
        ...state,
        workoutPlans: [action.payload, ...state.workoutPlans]
      };
    case 'ASSIGN_WORKOUT':
      return {
        ...state,
        workoutPlans: state.workoutPlans.map(w => w.id === action.payload.workoutId ? { ...w, assignedMemberId: action.payload.memberId } : w)
      };
    
    // Enquiries
    case 'ADD_ENQUIRY':
      return { ...state, enquiries: [action.payload, ...state.enquiries] };
    case 'DELETE_ENQUIRY':
      return { ...state, enquiries: state.enquiries.filter(e => e.id !== action.payload) };
    
    // Expenses
    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };
    
    // Feedback
    case 'ADD_FEEDBACK':
      return { ...state, feedbacks: [action.payload, ...state.feedbacks] };
 
    // Plan Upgrade Requests
    case 'CREATE_PLAN_UPGRADE_REQUEST':
      return { ...state, planUpgradeRequests: [action.payload, ...state.planUpgradeRequests] };
    case 'APPROVE_PLAN_UPGRADE_REQUEST': {
      const request = state.planUpgradeRequests.find(r => r.id === action.payload);
      if (!request) return state;

      return {
        ...state,
        planUpgradeRequests: state.planUpgradeRequests.map(r => r.id === action.payload ? { ...r, status: 'approved' } : r),
        owners: state.owners.map(o => o.id === request.ownerId ? { ...o, status: 'active', planId: request.requestedPlanId } : o)
      };
    }
    case 'REJECT_PLAN_UPGRADE_REQUEST':
      return {
        ...state,
        planUpgradeRequests: state.planUpgradeRequests.map(r => r.id === action.payload ? { ...r, status: 'rejected' } : r)
      };

    // Settings
    case 'UPDATE_GYM_INFO':
      return {
        ...state,
        gyms: state.gyms.map(g => g.id === action.payload.gymId ? {
          ...g,
          name: action.payload.name,
          addressLine1: action.payload.addressLine1,
          addressLine2: action.payload.addressLine2,
          city: action.payload.city,
          state: action.payload.state,
          pin: action.payload.pin,
          phone: action.payload.phone,
          email: action.payload.email,
          logoUrl: action.payload.logoUrl,
          gstNumber: action.payload.gstNumber,
          website: action.payload.website
        } : g)
      };
    case 'TOGGLE_GYM_FEATURE': {
      const { gymId, featureKey } = action.payload;
      return {
        ...state,
        gyms: state.gyms.map(g => {
          if (g.id === gymId) {
            const currentDisabled = g.disabledFeatures || [];
            const isCurrentlyDisabled = currentDisabled.includes(featureKey);
            const nextDisabled = isCurrentlyDisabled
              ? currentDisabled.filter(k => k !== featureKey)
              : [...currentDisabled, featureKey];
            return {
              ...g,
              disabledFeatures: nextDisabled
            };
          }
          return g;
        })
      };
    }
    case 'UPDATE_PLATFORM_SETTINGS':
      return {
        ...state,
        settings: action.payload
      };
    default:
      return state;
  }
}

interface GymContextProps extends GymState {
  dietPlans: DietPlan[];
  workoutPlans: WorkoutPlan[];
  dispatch: (action: GymAction) => void;
  refetch: () => Promise<void>;
}

export const GymContext = createContext<GymContextProps | undefined>(undefined);

const GYM_STATE_KEY = "@setugym_global_state_v1";

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gymReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 1. Initial Load: Load local AsyncStorage cache first for instant UI response
  useEffect(() => {
    let isMounted = true;
    const loadCachedState = async () => {
      try {
        const stored = await AsyncStorage.getItem(GYM_STATE_KEY);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            dispatch({ type: 'LOAD_STATE', payload: parsed });
          }
        }
      } catch (e) {
        console.warn("[GymContext] Error loading cached gym state:", e);
      }
    };

    loadCachedState();
    return () => { isMounted = false; };
  }, []);

  // 2. Debounced save to AsyncStorage to avoid I/O bottlenecks and UI stutters
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(GYM_STATE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn("[GymContext] Error writing gym state cache:", e);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [state]);

  // 3. Supabase data fetch with smart merging (never overwrites existing data with empty arrays)
  const fetchSupabaseData = async () => {
    try {
      console.log('[Supabase Sync] Fetching database tables in background...');
      const [
        profilesRes,
        gymsRes,
        membershipPlansRes,
        membersRes,
        noticesRes,
        invoicesRes,
        subPlansRes,
        gymSubscriptionsRes,
        feedbacksRes,
        staffRes,
        expensesRes
      ] = await Promise.allSettled([
        withTimeout(supabase.from('profiles').select('*').eq('is_deleted', false)),
        withTimeout(supabase.from('gyms').select('*').eq('is_deleted', false)),
        withTimeout(supabase.from('membership_plans').select('*').eq('is_deleted', false)),
        withTimeout(supabase.from('members').select('*').eq('is_deleted', false)),
        withTimeout(supabase.from('notices').select('*').eq('is_deleted', false)),
        withTimeout(supabase.from('invoices').select('*').eq('is_deleted', false)),
        withTimeout(supabase.from('subscription_plans').select('*').eq('is_deleted', false)),
        withTimeout(supabase.from('gym_subscriptions').select('*').eq('is_deleted', false)),
        withTimeout(supabase.from('feedbacks').select('*')),
        withTimeout(supabase.from('staff').select('*').eq('is_deleted', false)),
        withTimeout(supabase.from('expenses').select('*'))
      ]);

      const currentState = stateRef.current;
      const profiles = profilesRes.status === 'fulfilled' ? profilesRes.value.data : null;
      const gyms = gymsRes.status === 'fulfilled' ? gymsRes.value.data : null;
      const membershipPlans = membershipPlansRes.status === 'fulfilled' ? membershipPlansRes.value.data : null;
      const members = membersRes.status === 'fulfilled' ? membersRes.value.data : null;
      const notices = noticesRes.status === 'fulfilled' ? noticesRes.value.data : null;
      const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value.data : null;
      const subPlans = subPlansRes.status === 'fulfilled' ? subPlansRes.value.data : null;
      const gymSubscriptions = gymSubscriptionsRes.status === 'fulfilled' ? gymSubscriptionsRes.value.data : null;
      const feedbacksData = feedbacksRes.status === 'fulfilled' ? feedbacksRes.value.data : null;
      const staffData = staffRes.status === 'fulfilled' ? staffRes.value.data : null;
      const expensesData = expensesRes.status === 'fulfilled' ? expensesRes.value.data : null;

      const loadedGyms = (gyms && gyms.length > 0) ? gyms.map((g: any) => {
        const existingGym = currentState.gyms.find(eg => eg.id === g.id);
        return {
          id: g.id,
          name: g.name,
          ownerId: g.owner_id || '',
          addressLine1: g.address_line1,
          addressLine2: g.address_line2 || undefined,
          city: g.city,
          state: g.state,
          pin: g.pincode,
          phone: g.phone || '',
          email: g.email || '',
          logoUrl: g.logo_url || undefined,
          gstNumber: g.gst_number || undefined,
          website: g.website || undefined,
          status: g.is_active ? ('active' as const) : ('suspended' as const),
          disabledFeatures: existingGym?.disabledFeatures || ['biometric-attendance']
        };
      }) : undefined;

      const loadedPlans = (membershipPlans && membershipPlans.length > 0) ? membershipPlans.map((p: any) => ({
        id: p.id,
        name: p.name,
        durationDays: p.duration_days,
        price: Number(p.price),
        features: p.features as any,
        colorTag: p.color_tag,
        isPopular: p.is_popular,
        gymId: p.gym_id,
        currency: 'INR' as const
      })) : undefined;

      const loadedMembers = (members && members.length > 0) ? members
        .filter((m: any) => {
          const profile = profiles?.find((p: any) => p.id === m.id);
          return !profile || profile.role === 'member';
        })
        .map((m: any) => {
          const profile = profiles?.find((p: any) => p.id === m.id);
          return {
            id: m.id,
            name: profile?.full_name || 'Member',
            email: profile?.email || '',
            phone: profile?.phone || '',
            dob: m.date_of_birth || '1995-01-01',
            planId: m.membership_plan_id || '',
            startDate: m.join_date,
            endDate: m.expiry_date || '',
            status: m.status || 'active',
            assignedTrainerId: m.assigned_trainer_id || undefined,
            gymId: m.gym_id,
            gender: m.gender === 'male' ? ('Male' as const) : ('Female' as const),
            membershipId: m.member_code || m.id,
            bodyStatsLog: [],
            progressPhotos: []
          };
        }) : undefined;

      const loadedTrainers = (staffData && staffData.length > 0) ? staffData
        .filter((s: any) => {
          const profile = profiles?.find((p: any) => p.id === s.id);
          return !profile || profile.role === 'trainer';
        })
        .map((s: any) => {
          const profile = profiles?.find((p: any) => p.id === s.id);
          const assignedMemberIds = members ? members
            .filter((m: any) => m.assigned_trainer_id === s.id)
            .map((m: any) => m.id) : [];

          return {
            id: s.id,
            name: profile?.full_name || 'Trainer',
            email: profile?.email || '',
            phone: profile?.phone || '',
            specialization: s.specialization || '',
            schedule: typeof s.schedule === 'string' ? s.schedule : (s.schedule && typeof s.schedule === 'object' && 'shift' in s.schedule ? (s.schedule as any).shift : '06:00 AM - 02:00 PM'),
            gymId: s.gym_id,
            memberIds: assignedMemberIds
          };
        }) : undefined;

      const loadedInvoices = (invoices && invoices.length > 0) ? invoices.map((i: any) => ({
        id: i.id,
        invoiceNo: i.invoice_number,
        memberId: i.member_id,
        memberName: (loadedMembers || currentState.members).find((m: any) => m.id === i.member_id)?.name || 'Member',
        planName: (loadedPlans || currentState.memberPlans).find((p: any) => p.id === i.membership_plan_id)?.name || 'Membership Plan',
        amount: Number(i.total_amount),
        date: i.created_at.split('T')[0],
        dueDate: i.due_date || i.created_at.split('T')[0],
        status: i.status as any,
        subtotal: Number(i.subtotal),
        tax: Number(i.tax_amount),
        addOns: 0,
        total: Number(i.total_amount),
        gymId: i.gym_id,
        currency: 'INR' as const
      })) : undefined;

      const loadedNotices = (notices && notices.length > 0) ? notices.map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        priority: n.priority as any,
        date: n.created_at.split('T')[0],
        gymId: n.gym_id,
        audience: n.target_role as any
      })) : undefined;

      const loadedSubPlans = (subPlans && subPlans.length > 0) ? subPlans.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        billingCycle: p.billing_cycle as any,
        maxMembers: p.max_members,
        maxTrainers: p.max_trainers,
        maxGyms: p.max_gyms,
        features: p.features as any,
        isHighlighted: p.is_highlighted,
        isActive: p.is_active,
        durationDays: p.billing_cycle === 'yearly' ? 365 : 30
      })) : undefined;

      const loadedOwners = (profiles && loadedGyms && profiles.length > 0) ? profiles
        .filter((p: any) => p.role === 'gym_owner')
        .map((p: any) => {
          const ownerGyms = (loadedGyms || currentState.gyms).filter((g: any) => g.ownerId === p.id);
          const gymIds = ownerGyms.map((g: any) => g.id);
          const primaryGymId = gymIds[0];
          const primarySub = primaryGymId ? gymSubscriptions?.find((s: any) => s.gym_id === primaryGymId) : null;
          
          let trialStartDate = p.created_at || new Date().toISOString();
          let trialDaysRemaining = 0;
          let status = p.is_active ? 'active' : 'suspended';
          let planId = primarySub?.plan_id || undefined;
          
          if (primarySub) {
            status = primarySub.status;
            if (primarySub.status === 'trial') {
              trialStartDate = primarySub.trial_started_at;
              const endsAt = new Date(primarySub.trial_ends_at);
              const diffTime = endsAt.getTime() - Date.now();
              trialDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            }
          }

          return {
            id: p.id,
            name: p.full_name || 'Gym Owner',
            email: p.email || '',
            phone: p.phone || '',
            gymIds: gymIds,
            planId: planId,
            status: status as any,
            trialStartDate: trialStartDate,
            trialDaysRemaining: trialDaysRemaining
          };
        }) : undefined;

      const loadedExpenses = (expensesData && expensesData.length > 0) ? expensesData.map((e: any) => ({
        id: e.id,
        gymId: e.gym_id,
        category: e.category,
        amount: Number(e.amount),
        date: e.date,
        description: e.description || ''
      })) : undefined;

      // Smartly merge so locally created items are ALWAYS preserved
      dispatch({
        type: 'LOAD_STATE',
        payload: {
          gyms: mergeById(currentState.gyms, loadedGyms),
          memberPlans: mergeById(currentState.memberPlans, loadedPlans),
          members: mergeById(currentState.members, loadedMembers),
          trainers: mergeById(currentState.trainers, loadedTrainers),
          invoices: mergeById(currentState.invoices, loadedInvoices),
          notices: mergeById(currentState.notices, loadedNotices),
          expenses: mergeById(currentState.expenses, loadedExpenses),
          subscriptionPlans: mergeById(currentState.subscriptionPlans, loadedSubPlans),
          owners: loadedOwners && loadedOwners.length > 0 
            ? updateAllOwnerDues(mergeById(currentState.owners, loadedOwners), currentState.invoices, currentState.subscriptionPlans) 
            : currentState.owners
        }
      });
      console.log('[Supabase Sync] Sync reconciliation completed smoothly.');
    } catch (e) {
      console.warn('[Supabase Sync] Background sync warning (safe fallback maintained):', e);
    }
  };

  // Run Supabase sync after component mount
  useEffect(() => {
    fetchSupabaseData();
  }, []);

  const refetch = async () => {
    await fetchSupabaseData();
  };

  // 4. Instant UI dispatch with asynchronous background Supabase syncing
  const wrappedDispatch = (action: GymAction) => {
    // ⚡ INSTANT LOCAL DISPATCH: Updates state in 0ms without waiting for network!
    dispatch(action);

    // 🌐 Non-blocking Background Sync
    (async () => {
      try {
        switch (action.type) {
          case 'ADD_MEMBER':
          case 'UPDATE_MEMBER': {
            const m = action.payload;
            const resolvedMemberId = resolveId(m.id);
            const resolvedGymId = resolveId(m.gymId);

            // Upsert Profile
            await withTimeout(supabase.from('profiles').upsert({
              id: resolvedMemberId,
              role: 'member',
              gym_id: resolvedGymId,
              full_name: m.name,
              phone: m.phone || null,
              is_active: m.status === 'active'
            }));

            // Upsert Member row
            await withTimeout(supabase.from('members').upsert({
              id: resolvedMemberId,
              gym_id: resolvedGymId,
              member_code: m.membershipId || m.id,
              membership_plan_id: m.planId ? resolveId(m.planId) : null,
              assigned_trainer_id: m.assignedTrainerId ? resolveId(m.assignedTrainerId) : null,
              date_of_birth: m.dob || null,
              gender: m.gender ? (m.gender.toLowerCase() as any) : null,
              address: m.address || null,
              emergency_contact: null,
              join_date: m.joiningDate || new Date().toISOString().split('T')[0],
              expiry_date: m.endDate || null,
              status: m.status as any
            }));
            break;
          }

          case 'DELETE_MEMBER': {
            const resolvedMemberId = resolveId(action.payload);
            await withTimeout(supabase
              .from('members')
              .update({ is_deleted: true })
              .eq('id', resolvedMemberId));
            break;
          }

          case 'MARK_MEMBER_INACTIVE': {
            const resolvedMemberId = resolveId(action.payload);
            await withTimeout(supabase
              .from('members')
              .update({ status: 'inactive' })
              .eq('id', resolvedMemberId));
            break;
          }

          case 'ADD_INVOICE':
          case 'UPDATE_INVOICE': {
            const inv = action.payload;
            const resolvedInvId = resolveId(inv.id);
            const resolvedGymId = resolveId(inv.gymId);
            const resolvedMemberId = resolveId(inv.memberId);

            await withTimeout(supabase.from('invoices').upsert({
              id: resolvedInvId,
              gym_id: resolvedGymId,
              member_id: resolvedMemberId,
              invoice_number: inv.invoiceNo,
              membership_plan_id: inv.planId ? resolveId(inv.planId) : null,
              subtotal: inv.subtotal,
              tax_percent: 18.00,
              tax_amount: inv.tax || 0,
              total_amount: inv.total,
              status: inv.status as any,
              due_date: inv.dueDate || null,
              paid_date: inv.status === 'paid' ? new Date().toISOString().split('T')[0] : null,
              payment_method: inv.paymentMethod || null
            }));
            break;
          }

          case 'ADD_MEMBER_PLAN':
          case 'UPDATE_MEMBER_PLAN': {
            const p = action.payload;
            const resolvedPlanId = resolveId(p.id);
            const resolvedGymId = resolveId(p.gymId);

            await withTimeout(supabase.from('membership_plans').upsert({
              id: resolvedPlanId,
              gym_id: resolvedGymId,
              name: p.name,
              duration_days: p.durationDays,
              price: p.price,
              features: p.features,
              color_tag: p.colorTag,
              is_popular: p.isPopular,
              is_active: true
            }));
            break;
          }

          case 'DELETE_MEMBER_PLAN': {
            const resolvedPlanId = resolveId(action.payload);
            await withTimeout(supabase
              .from('membership_plans')
              .update({ is_deleted: true })
              .eq('id', resolvedPlanId));
            break;
          }

          case 'ADD_NOTICE': {
            const n = action.payload;
            const resolvedNoticeId = resolveId(n.id);
            const resolvedGymId = resolveId(n.gymId);

            await withTimeout(supabase.from('notices').upsert({
              id: resolvedNoticeId,
              gym_id: resolvedGymId,
              title: n.title,
              body: n.body,
              priority: n.priority as any,
              target_role: n.audience || 'all',
              is_active: true
            }));
            break;
          }

          case 'DELETE_NOTICE': {
            const resolvedNoticeId = resolveId(action.payload);
            await withTimeout(supabase
              .from('notices')
              .update({ is_deleted: true })
              .eq('id', resolvedNoticeId));
            break;
          }

          case 'ADD_EXPENSE': {
            const exp = action.payload;
            const resolvedExpenseId = resolveId(exp.id);
            const resolvedGymId = resolveId(exp.gymId);

            await withTimeout(supabase.from('expenses').upsert({
              id: resolvedExpenseId,
              gym_id: resolvedGymId,
              category: exp.category,
              amount: exp.amount,
              date: exp.date,
              description: exp.description
            }));
            break;
          }

          case 'DELETE_EXPENSE': {
            const resolvedExpenseId = resolveId(action.payload);
            await withTimeout(supabase
              .from('expenses')
              .delete()
              .eq('id', resolvedExpenseId));
            break;
          }

          case 'DELETE_INVOICE': {
            const resolvedInvId = resolveId(action.payload);
            await withTimeout(supabase
              .from('invoices')
              .update({ is_deleted: true })
              .eq('id', resolvedInvId));
            break;
          }

          case 'DELETE_TRAINER': {
            const trainerId = resolveId(action.payload);
            await withTimeout(supabase.from('profiles').update({ is_deleted: true }).eq('id', trainerId));
            await withTimeout(supabase.from('staff').update({ is_deleted: true }).eq('id', trainerId));
            break;
          }

          case 'DELETE_OWNER': {
            const ownerId = resolveId(action.payload);
            await withTimeout(supabase.from('profiles').update({ is_deleted: true }).eq('id', ownerId));
            await withTimeout(supabase.from('gyms').update({ is_deleted: true }).eq('owner_id', ownerId));
            break;
          }

          case 'ADD_FEEDBACK': {
            const feed = action.payload;
            const resolvedFeedId = resolveId(feed.id);
            const resolvedGymId = resolveId(feed.gymId);
            const sessionUser = (await supabase.auth.getUser()).data.user;
            const uId = sessionUser?.id;

            if (uId) {
              await withTimeout(supabase.from('feedbacks').upsert({
                id: resolvedFeedId,
                gym_id: resolvedGymId,
                user_id: uId,
                rating: feed.rating,
                comment: feed.comment
              }));
            }
            break;
          }
        }
      } catch (err: any) {
        // Safe background catch: local state & cache already have the updated data
        console.log('[Background Sync]: Handled gracefully ->', err?.message || err);
      }
    })();
  };

  return (
    <GymContext.Provider value={{ ...state, dispatch: wrappedDispatch, refetch }}>
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => {
  const context = React.useContext(GymContext);
  if (!context) {
    throw new Error("useGym must be used within a GymProvider");
  }
  return context;
};
