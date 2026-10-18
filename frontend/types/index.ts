export interface Gym {
  id: string;
  name: string;
  ownerId: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pin: string;
  phone: string;
  email: string;
  logoUrl?: string;
  gstNumber?: string;
  website?: string;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  disabledFeatures?: string[];
}

export interface GymOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  gymIds: string[]; // multi-gym support
  planId?: string;
  status: 'active' | 'trial' | 'expired' | 'suspended';
  trialStartDate: string; // ISO Date
  trialDaysRemaining: number;
  startDate?: string;
  endDate?: string;
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod?: string;
  comments?: string;
  discountType?: 'Percent' | 'Amount';
  discount?: number;
  admissionFees?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  maxMembers: number;
  maxTrainers: number;
  durationDays: number;
  features: string[];
  isHighlighted: boolean;
  isActive: boolean;
}

export interface BodyStat {
  date: string; // YYYY-MM-DD
  weight: number; // kg
  height: number; // cm
  bmi: number;
  chest: number; // inches
  waist: number; // inches
  hips: number; // inches
}

export interface ProgressPhoto {
  date: string; // YYYY-MM-DD
  uri: string;
}

export interface Expense {
  id: string;
  gymId: string;
  category: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
}

export interface Feedback {
  id: string;
  gymId: string;
  gymName: string;
  ownerName: string;
  date: string; // YYYY-MM-DD
  rating: number;
  comment: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  photoUrl?: string;
  planId: string; // member plan id
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending' | 'inactive' | 'blocked';
  assignedTrainerId?: string;
  gymId: string;
  bodyStatsLog: BodyStat[];
  progressPhotos: ProgressPhoto[];
  gender?: 'Male' | 'Female';
  membershipId?: string;
  batch?: string;
  joiningDate?: string;
  paymentDate?: string;
  paidAmount?: number;
  paymentMethod?: string;
  dueAmount?: number;
  comments?: string;
  discountType?: 'Percent' | 'Amount';
  discount?: number;
  admissionFees?: number;
  address?: string;
  notes?: string;
}

export interface Trainer {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  schedule: string; // e.g. "06:00 AM - 12:00 PM"
  gymId: string;
  memberIds: string[];
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  userName: string;
  role: 'member' | 'trainer';
  gymId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM
  checkOutTime: string | null;
  status: 'checked_in' | 'checked_out';
  duration?: number; // duration in minutes
  scannedBy: string; // trainer id, "Kiosk", or "Self QR"
  method: 'qr' | 'kiosk' | 'manual';
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  memberId: string;
  memberName: string;
  planName: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
  subtotal: number;
  tax: number;
  addOns: number;
  total: number;
  gymId: string;
  currency?: 'USD' | 'INR' | 'EUR' | 'GBP';
  paidAmount?: number;
  dueAmount?: number;
  hasInstallments?: boolean;
  firstInstallmentAmount?: number;
  firstInstallmentStatus?: 'paid' | 'pending';
  secondInstallmentAmount?: number;
  secondInstallmentStatus?: 'paid' | 'pending';
  secondInstallmentDueDate?: string;
  planId?: string;
  paymentMethod?: string;
}

export interface MemberPlan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  features: string[];
  colorTag: string; // e.g. "#6C47FF"
  isPopular: boolean;
  gymId: string;
  currency?: 'USD' | 'INR' | 'EUR' | 'GBP';
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  priority: 'normal' | 'urgent';
  date: string;
  gymId: string;
  audience: 'everyone' | 'members' | 'trainers' | 'receptionists' | 'admins';
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string; // ISO Date string
  audience: 'everyone' | 'members' | 'trainers' | 'receptionists' | 'admins';
  read: boolean;
  priority: 'normal' | 'urgent';
  relatedId?: string; // e.g. Notice ID
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  description: string;
  gymId: string;
  date: string; // YYYY-MM-DD
  messageSent: boolean;
  sentMessageText?: string;
}

export interface PlanUpgradeRequest {
  id: string;
  ownerId: string;
  ownerName: string;
  gymName: string;
  currentPlanId?: string;
  requestedPlanId: string;
  requestedPlanName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string; // ISO date
}

export interface GymState {
  gyms: Gym[];
  owners: GymOwner[];
  subscriptionPlans: SubscriptionPlan[];
  members: Member[];
  trainers: Trainer[];
  attendanceRecords: AttendanceRecord[];
  invoices: Invoice[];
  memberPlans: MemberPlan[];
  notices: Notice[];
  notifications: AppNotification[];
  enquiries: Enquiry[];
  expenses: Expense[];
  feedbacks: Feedback[];
  planUpgradeRequests: PlanUpgradeRequest[];
  settings: {
    appName: string;
    supportEmail: string;
    trialDurationDays: number;
    paymentGatewayActive: boolean;
  };
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number | string;
  restSeconds: number;
  notes: string;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  goal: string;
  daysPerWeek: number;
  schedule: {
    [dayName: string]: Exercise[];
  };
  assignedMemberId?: string;
  gymId: string;
}

export interface MealItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DietPlan {
  id: string;
  title: string;
  goal: "Weight Loss" | "Weight Gain" | "Maintenance";
  dailyCalories: number;
  meals: {
    breakfast: MealItem[];
    lunch: MealItem[];
    dinner: MealItem[];
    snacks: MealItem[];
  };
  assignedMemberId?: string;
  gymId: string;
}
