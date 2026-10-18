import { Gym, GymOwner, SubscriptionPlan, Member, Trainer, AttendanceRecord, Invoice, MemberPlan, Notice, Enquiry, Expense, Feedback, PlanUpgradeRequest } from '../types';
import { subDays, format, subMonths } from 'date-fns';

// 1. Subscription tiers sold to Gym Owners by Super Admin
export const MOCK_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "sub-lite",
    name: "Starter Lite",
    price: 49,
    maxMembers: 50,
    maxTrainers: 3,
    durationDays: 30,
    features: ["Basic QR Attendance", "Up to 50 Members", "3 Trainer Logins", "Email Support"],
    isHighlighted: false,
    isActive: true
  },
  {
    id: "sub-standard",
    name: "Growth Standard",
    price: 99,
    maxMembers: 250,
    maxTrainers: 10,
    durationDays: 90,
    features: ["Standard QR Attendance", "Up to 250 Members", "10 Trainer Logins", "Invoicing & Reminders", "Progress Photo Timeline", "Announcements", "Priority Support"],
    isHighlighted: true,
    isActive: true
  },
  {
    id: "sub-pro",
    name: "Enterprise Pro",
    price: 199,
    maxMembers: 1000,
    maxTrainers: 30,
    durationDays: 365,
    features: ["All Standard Features", "Up to 1000 Members", "30 Trainer Logins", "Locked Reception Kiosk Mode", "Multi-gym Owner Routing", "GST Invoicing & Reports", "Export Data (CSV)", "24/7 Dedicated Support"],
    isHighlighted: false,
    isActive: true
  }
];

// 2. Gym Owners (including multi-gym, active, trial, and expired owners)
export const MOCK_OWNERS: GymOwner[] = [
  {
    id: "owner-active-1",
    name: "Robert Fitfield",
    email: "owner@fitzone.com", // owner@fitzone.com / Owner@123
    phone: "+1 (555) 019-2831",
    gymIds: ["gym-fitzone-1", "gym-fitzone-2"], // multi-gym support!
    planId: "sub-standard",
    status: "active",
    trialStartDate: subDays(new Date(), 30).toISOString(),
    trialDaysRemaining: 0
  },
  {
    id: "owner-active-2",
    name: "Sarah Temple",
    email: "sarah@irontemple.com",
    phone: "+1 (555) 012-9844",
    gymIds: ["gym-irontemple"],
    planId: "sub-pro",
    status: "active",
    trialStartDate: subDays(new Date(), 45).toISOString(),
    trialDaysRemaining: 0
  },
  {
    id: "owner-trial",
    name: "Thomas Cardio",
    email: "thomas@cardiohub.com",
    phone: "+1 (555) 023-4567",
    gymIds: ["gym-cardiohub"],
    planId: undefined, // no plan yet, on trial
    status: "trial",
    trialStartDate: subDays(new Date(), 4).toISOString(), // 4 days ago. Out of 7 days trial, 3 remaining
    trialDaysRemaining: 3
  },
  {
    id: "owner-expired",
    name: "James Muscle",
    email: "james@muscleworld.com",
    phone: "+1 (555) 034-5678",
    gymIds: ["gym-muscleworld"],
    planId: undefined,
    status: "expired",
    trialStartDate: subDays(new Date(), 10).toISOString(), // 10 days ago (expired trial, no active plan)
    trialDaysRemaining: 0
  }
];

// 3. Gyms
export const MOCK_GYMS: Gym[] = [
  {
    id: "gym-fitzone-1",
    name: "FitZone Downtown",
    ownerId: "owner-active-1",
    addressLine1: "123 Broadway Blvd",
    addressLine2: "Suite 400",
    city: "New York",
    state: "NY",
    pin: "10001",
    phone: "+1 (555) 123-4567",
    email: "downtown@fitzone.com",
    logoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
    gstNumber: "22AAAAA1111A1Z1",
    website: "https://fitzone.com",
    status: "active"
  },
  {
    id: "gym-fitzone-2",
    name: "FitZone Brooklyn",
    ownerId: "owner-active-1",
    addressLine1: "456 Flatbush Ave",
    city: "Brooklyn",
    state: "NY",
    pin: "11201",
    phone: "+1 (555) 987-6543",
    email: "brooklyn@fitzone.com",
    logoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop",
    gstNumber: "22BBBBB2222B2Z2",
    website: "https://fitzone.com",
    status: "active"
  },
  {
    id: "gym-irontemple",
    name: "Iron Temple Gym",
    ownerId: "owner-active-2",
    addressLine1: "789 Powerhouse Road",
    city: "Austin",
    state: "TX",
    pin: "73301",
    phone: "+1 (555) 456-7890",
    email: "austin@irontemple.com",
    logoUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&h=200&fit=crop",
    gstNumber: "44CCCCC3333C3Z3",
    website: "https://irontemple.com",
    status: "active"
  },
  {
    id: "gym-cardiohub",
    name: "Cardio Hub (Trial)",
    ownerId: "owner-trial",
    addressLine1: "321 Running Way",
    city: "Miami",
    state: "FL",
    pin: "33101",
    phone: "+1 (555) 789-0123",
    email: "miami@cardiohub.com",
    logoUrl: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=200&h=200&fit=crop",
    gstNumber: "",
    website: "",
    status: "trial"
  },
  {
    id: "gym-muscleworld",
    name: "Muscle World (Expired)",
    ownerId: "owner-expired",
    addressLine1: "555 Heavy Bench St",
    city: "Chicago",
    state: "IL",
    pin: "60601",
    phone: "+1 (555) 890-1234",
    email: "chicago@muscleworld.com",
    logoUrl: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=200&h=200&fit=crop",
    gstNumber: "",
    website: "",
    status: "expired"
  }
];

// 4. Member Plans (sold by Gym Owners to Gym Members)
export const MOCK_MEMBER_PLANS: MemberPlan[] = [
  // FitZone Downtown & Brooklyn plans
  {
    id: "mplan-fit-monthly",
    name: "Standard Monthly",
    durationDays: 30,
    price: 4000,
    features: ["All Cardio & Strength Areas", "Locker Room Access", "1 Free Trainer Orientation"],
    colorTag: "#6C47FF",
    isPopular: false,
    gymId: "gym-fitzone-1",
    currency: "INR"
  },
  {
    id: "mplan-fit-monthly-2",
    name: "Standard Monthly",
    durationDays: 30,
    price: 4000,
    features: ["All Cardio & Strength Areas", "Locker Room Access", "1 Free Trainer Orientation"],
    colorTag: "#6C47FF",
    isPopular: false,
    gymId: "gym-fitzone-2",
    currency: "INR"
  },
  {
    id: "mplan-fit-quarterly",
    name: "Premium Quarterly",
    durationDays: 90,
    price: 135, // 10% discount
    features: ["Standard Access", "Group Exercise Classes", "Custom Diet Blueprint", "2 Guest Passes/Month"],
    colorTag: "#00C896",
    isPopular: true,
    gymId: "gym-fitzone-1",
    currency: "USD"
  },
  {
    id: "mplan-fit-annual",
    name: "VIP Elite Annual",
    durationDays: 365,
    price: 450, // 25% discount
    features: ["Full Access to all FitZone branches", "Personal Trainer (2 sessions/mo)", "Steam Room & Sauna", "Unlimited Group Classes", "Free Gym T-Shirt"],
    colorTag: "#FF6B35",
    isPopular: false,
    gymId: "gym-fitzone-1",
    currency: "USD"
  },
  // Iron Temple plans
  {
    id: "mplan-iron-monthly",
    name: "Heavy Lifter Monthly",
    durationDays: 30,
    price: 60,
    features: ["24/7 Access", "Chalk Allowed", "Platform Access", "Sauna & Ice Bath"],
    colorTag: "#6C47FF",
    isPopular: true,
    gymId: "gym-irontemple",
    currency: "USD"
  }
];

// 5. Trainers (3 per gym)
export const MOCK_TRAINERS: Trainer[] = [
  // Gym 1 - FitZone Downtown
  {
    id: "trainer-1",
    name: "Mike Ironson",
    email: "trainer@fitzone.com", // trainer@fitzone.com / Trainer@123
    phone: "+1 (555) 765-4321",
    specialization: "Bodybuilding & Hypertrophy",
    schedule: "06:00 AM - 02:00 PM",
    gymId: "gym-fitzone-1",
    memberIds: ["member-john", "member-emily", "member-david"]
  },
  {
    id: "trainer-2",
    name: "Clara Slim",
    email: "clara@fitzone.com",
    phone: "+1 (555) 543-2109",
    specialization: "Weight Loss & Pilates",
    schedule: "02:00 PM - 10:00 PM",
    gymId: "gym-fitzone-1",
    memberIds: ["member-sarah", "member-jessica"]
  },
  {
    id: "trainer-3",
    name: "Alex Power",
    email: "alex@fitzone.com",
    phone: "+1 (555) 321-0987",
    specialization: "Powerlifting & Strength",
    schedule: "09:00 AM - 05:00 PM",
    gymId: "gym-fitzone-1",
    memberIds: ["member-brian"]
  },
  // Gym 2 - Iron Temple
  {
    id: "trainer-iron-1",
    name: "Hulk Strong",
    email: "hulk@irontemple.com",
    phone: "+1 (555) 444-5555",
    specialization: "Olympic Lifting",
    schedule: "05:00 AM - 01:00 PM",
    gymId: "gym-irontemple",
    memberIds: []
  }
];

// 6. Detailed Body Stat logs for charts
const generateBodyStats = (startWeight: number, bmiBase: number): any[] => {
  return [
    { date: format(subDays(new Date(), 28), "yyyy-MM-dd"), weight: startWeight, height: 178, bmi: bmiBase, chest: 40, waist: 34, hips: 38 },
    { date: format(subDays(new Date(), 21), "yyyy-MM-dd"), weight: startWeight - 0.5, height: 178, bmi: Number((bmiBase - 0.15).toFixed(1)), chest: 40, waist: 33.6, hips: 38 },
    { date: format(subDays(new Date(), 14), "yyyy-MM-dd"), weight: startWeight - 1.2, height: 178, bmi: Number((bmiBase - 0.38).toFixed(1)), chest: 39.8, waist: 33.2, hips: 37.7 },
    { date: format(subDays(new Date(), 7), "yyyy-MM-dd"), weight: startWeight - 1.8, height: 178, bmi: Number((bmiBase - 0.57).toFixed(1)), chest: 39.5, waist: 32.8, hips: 37.5 },
    { date: format(new Date(), "yyyy-MM-dd"), weight: startWeight - 2.4, height: 178, bmi: Number((bmiBase - 0.76).toFixed(1)), chest: 39.4, waist: 32.2, hips: 37.1 }
  ];
};

const generateProgressPhotos = (): any[] => {
  return [
    { date: format(subDays(new Date(), 28), "yyyy-MM-dd"), uri: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&h=250&fit=crop" },
    { date: format(subDays(new Date(), 14), "yyyy-MM-dd"), uri: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=250&fit=crop" },
    { date: format(new Date(), "yyyy-MM-dd"), uri: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&h=250&fit=crop" }
  ];
};

// 7. Members (10 per gym, 30 total. Gym 1 (FitZone Downtown) has detailed records for logins/flows)
export const MOCK_MEMBERS: Member[] = [
  // Gym 1 - FitZone Downtown Members
  {
    id: "member-john",
    name: "John Doe",
    email: "john@member.com", // john@member.com / Member@123
    phone: "+1 (555) 111-2222",
    dob: "1994-06-15",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 15).toISOString(),
    endDate: subDays(new Date(), -15).toISOString(), // Active, expires in 15 days
    status: "active",
    assignedTrainerId: "trainer-1",
    gymId: "gym-fitzone-1",
    bodyStatsLog: generateBodyStats(85.0, 26.8),
    progressPhotos: generateProgressPhotos()
  },
  {
    id: "member-emily",
    name: "Emily Watson",
    email: "emily@member.com",
    phone: "+1 (555) 222-3333",
    dob: "1997-03-24",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    planId: "mplan-fit-quarterly",
    startDate: subDays(new Date(), 70).toISOString(),
    endDate: subDays(new Date(), -20).toISOString(), // Active, expires in 20 days
    status: "active",
    assignedTrainerId: "trainer-1",
    gymId: "gym-fitzone-1",
    bodyStatsLog: generateBodyStats(62.0, 19.6),
    progressPhotos: generateProgressPhotos()
  },
  {
    id: "member-sarah",
    name: "Sarah Jenkins",
    email: "sarah@member.com",
    phone: "+1 (555) 333-4444",
    dob: "1991-11-02",
    photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 28).toISOString(),
    endDate: subDays(new Date(), -2).toISOString(), // Active, expires in 2 days (Trigger reminder banner!)
    status: "active",
    assignedTrainerId: "trainer-2",
    gymId: "gym-fitzone-1",
    bodyStatsLog: generateBodyStats(70.0, 22.1),
    progressPhotos: generateProgressPhotos()
  },
  {
    id: "member-expired-bob",
    name: "Bob Miller",
    email: "bob@member.com",
    phone: "+1 (555) 444-5555",
    dob: "1988-08-12",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 45).toISOString(),
    endDate: subDays(new Date(), 15).toISOString(), // Expired 15 days ago
    status: "expired",
    assignedTrainerId: undefined,
    gymId: "gym-fitzone-1",
    bodyStatsLog: generateBodyStats(92.0, 29.0),
    progressPhotos: []
  },
  {
    id: "member-david",
    name: "David Smith",
    email: "david@member.com",
    phone: "+1 (555) 555-6666",
    dob: "1995-12-05",
    photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop",
    planId: "mplan-fit-annual",
    startDate: subDays(new Date(), 120).toISOString(),
    endDate: subDays(new Date(), -245).toISOString(), // Active
    status: "active",
    assignedTrainerId: "trainer-1",
    gymId: "gym-fitzone-1",
    bodyStatsLog: generateBodyStats(78.5, 24.8),
    progressPhotos: []
  },
  {
    id: "member-jessica",
    name: "Jessica Taylor",
    email: "jessica@member.com",
    phone: "+1 (555) 666-7777",
    dob: "1996-04-18",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 5).toISOString(),
    endDate: subDays(new Date(), -25).toISOString(), // Active
    status: "active",
    assignedTrainerId: "trainer-2",
    gymId: "gym-fitzone-1",
    bodyStatsLog: generateBodyStats(55.2, 17.4),
    progressPhotos: []
  },
  {
    id: "member-brian",
    name: "Brian Clark",
    email: "brian@member.com",
    phone: "+1 (555) 777-8888",
    dob: "1990-10-30",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop",
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 2).toISOString(),
    endDate: subDays(new Date(), -28).toISOString(), // Active
    status: "active",
    assignedTrainerId: "trainer-3",
    gymId: "gym-fitzone-1",
    bodyStatsLog: generateBodyStats(88.0, 27.8),
    progressPhotos: []
  },
  {
    id: "member-pending-alice",
    name: "Alice Cooper",
    email: "alice@member.com",
    phone: "+1 (555) 888-9999",
    dob: "1999-01-14",
    photoUrl: undefined,
    planId: "mplan-fit-monthly",
    startDate: new Date().toISOString(),
    endDate: subDays(new Date(), -30).toISOString(),
    status: "pending", // Pending activation
    assignedTrainerId: undefined,
    gymId: "gym-fitzone-1",
    bodyStatsLog: [],
    progressPhotos: []
  },
  {
    id: "member-inactive-chris",
    name: "Chris Evans",
    email: "chris@member.com",
    phone: "+1 (555) 999-0000",
    dob: "1987-05-19",
    photoUrl: undefined,
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 100).toISOString(),
    endDate: subDays(new Date(), -265).toISOString(),
    status: "inactive", // Voluntarily frozen / inactive
    assignedTrainerId: undefined,
    gymId: "gym-fitzone-1",
    bodyStatsLog: [],
    progressPhotos: []
  },
  {
    id: "member-lucas",
    name: "Lucas Gray",
    email: "lucas@member.com",
    phone: "+1 (555) 123-9876",
    dob: "1992-09-08",
    photoUrl: undefined,
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 10).toISOString(),
    endDate: subDays(new Date(), -20).toISOString(),
    status: "active",
    assignedTrainerId: undefined,
    gymId: "gym-fitzone-1",
    bodyStatsLog: generateBodyStats(80, 25.2),
    progressPhotos: []
  },

  // Gym 2 - FitZone Brooklyn Members (Quick placeholders to fill list counts)
  {
    id: "member-brooklyn-1",
    name: "Jack Reacher",
    email: "jack@reacher.com",
    phone: "+1 (555) 234-9999",
    dob: "1983-10-29",
    planId: "mplan-fit-monthly-2",
    startDate: subDays(new Date(), 10).toISOString(),
    endDate: subDays(new Date(), -20).toISOString(),
    status: "active",
    gymId: "gym-fitzone-2",
    bodyStatsLog: [],
    progressPhotos: []
  }
];

// 8. 30 Days of Attendance Records (Mix of check-ins)
// We will auto-generate some historical attendance for members in the last 30 days
const generateAttendanceData = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const memberIds = ["member-john", "member-emily", "member-sarah", "member-david", "member-jessica", "member-brian"];
  const gymId = "gym-fitzone-1";
  
  // Seed for past 30 days
  for (let i = 0; i < 30; i++) {
    const currentDate = subDays(new Date(), i);
    const dateStr = format(currentDate, "yyyy-MM-dd");
    
    // Pick 2-4 members who attended that day
    const attendees = memberIds.filter(() => Math.random() > 0.4);
    attendees.forEach((memberId, idx) => {
      const hour = 7 + (idx * 2) + Math.floor(Math.random() * 2);
      const min = Math.floor(Math.random() * 60);
      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      
      const member = MOCK_MEMBERS.find(m => m.id === memberId);
      const name = member ? member.name : "Unknown Member";
      
      const checkOutHour = hour + 1 + Math.floor(Math.random() * 2);
      const checkOutMin = Math.floor(Math.random() * 60);
      const checkOutTimeStr = `${checkOutHour.toString().padStart(2, '0')}:${checkOutMin.toString().padStart(2, '0')}`;
      const durationMins = (checkOutHour - hour) * 60 + (checkOutMin - min);

      records.push({
        id: `att-${dateStr}-${memberId}`,
        memberId,
        userName: name,
        role: 'member',
        gymId,
        date: dateStr,
        checkInTime: timeStr,
        checkOutTime: checkOutTimeStr,
        status: 'checked_out',
        duration: durationMins,
        scannedBy: "trainer-1",
        method: Math.random() > 0.2 ? "qr" : "manual"
      });
    });
  }
  
  return records;
};

export const MOCK_ATTENDANCE: AttendanceRecord[] = generateAttendanceData();

// 9. Invoices (5 per gym, mix of paid/pending/overdue)
export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv-001",
    invoiceNo: "INV-2026-001",
    memberId: "member-john",
    memberName: "John Doe",
    planName: "Standard Monthly Plan",
    amount: 4720.00,
    date: format(subDays(new Date(), 15), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -15), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 4000.00,
    tax: 720.00,
    addOns: 0.00,
    total: 4720.00,
    gymId: "gym-fitzone-1",
    currency: "INR"
  },
  {
    id: "inv-002",
    invoiceNo: "INV-2026-002",
    memberId: "member-emily",
    memberName: "Emily Watson",
    planName: "Premium Quarterly Plan",
    amount: 159.30, // 135 plan + 24.3 tax
    date: format(subDays(new Date(), 70), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -20), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 135.00,
    tax: 24.30,
    addOns: 0.00,
    total: 159.30,
    gymId: "gym-fitzone-1",
    currency: "USD"
  },
  {
    id: "inv-003",
    invoiceNo: "INV-2026-003",
    memberId: "member-sarah",
    memberName: "Sarah Jenkins",
    planName: "Standard Monthly Plan",
    amount: 4720.00,
    date: format(subDays(new Date(), 28), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -2), "yyyy-MM-dd"),
    status: "pending", // Unpaid but not overdue yet
    subtotal: 4000.00,
    tax: 720.00,
    addOns: 0.00,
    total: 4720.00,
    gymId: "gym-fitzone-1",
    currency: "INR",
    hasInstallments: true,
    firstInstallmentAmount: 2360.00,
    firstInstallmentStatus: "paid",
    secondInstallmentAmount: 2360.00,
    secondInstallmentStatus: "pending",
    secondInstallmentDueDate: format(subDays(new Date(), -10), "yyyy-MM-dd")
  },
  {
    id: "inv-004",
    invoiceNo: "INV-2026-004",
    memberId: "member-expired-bob",
    memberName: "Bob Miller",
    planName: "Standard Monthly Plan",
    amount: 4720.00,
    date: format(subDays(new Date(), 45), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), 15), "yyyy-MM-dd"), // Overdue!
    status: "overdue",
    subtotal: 4000.00,
    tax: 720.00,
    addOns: 0.00,
    total: 4720.00,
    gymId: "gym-fitzone-1",
    currency: "INR",
    hasInstallments: true,
    firstInstallmentAmount: 2360.00,
    firstInstallmentStatus: "paid",
    secondInstallmentAmount: 2360.00,
    secondInstallmentStatus: "pending",
    secondInstallmentDueDate: format(subDays(new Date(), 5), "yyyy-MM-dd")
  },
  {
    id: "inv-005",
    invoiceNo: "INV-2026-005",
    memberId: "member-david",
    memberName: "David Smith",
    planName: "VIP Elite Annual Plan",
    amount: 531.00, // 450 plan + 81 tax
    date: format(subDays(new Date(), 120), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -245), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 450.00,
    tax: 81.00,
    addOns: 0.00,
    total: 531.00,
    gymId: "gym-fitzone-1",
    currency: "USD"
  }
];

// 10. Notices (5 total)
export const MOCK_NOTICES: Notice[] = [
  {
    id: "notice-1",
    title: "Memorial Day Gym Hours",
    body: "Please note that the gym will operate on a shortened schedule this coming Monday. We will be open from 08:00 AM to 04:00 PM. Group classes are cancelled.",
    priority: "normal",
    date: format(subDays(new Date(), 2), "yyyy-MM-dd"),
    gymId: "gym-fitzone-1",
    audience: "everyone"
  },
  {
    id: "notice-2",
    title: "Sauna Maintenance Closure",
    body: "The steam sauna room will be closed for routine deep cleaning and boiler maintenance on Wednesday, June 3rd. We expect it to reopen by 06:00 PM on the same day.",
    priority: "urgent",
    date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    gymId: "gym-fitzone-1",
    audience: "members"
  },
  {
    id: "notice-3",
    title: "New Yoga Classes Starting!",
    body: "We are thrilled to introduce Hatha Yoga with our new instructor, Chloe, every Tuesday and Thursday at 07:00 PM. Book your spot via the front desk!",
    priority: "normal",
    date: format(new Date(), "yyyy-MM-dd"),
    gymId: "gym-fitzone-1",
    audience: "members"
  },
  {
    id: "notice-4",
    title: "Trainer Team Meeting",
    body: "Reminder to all trainers: We have our monthly performance and client alignment meeting this Saturday at 02:00 PM in the main conference room.",
    priority: "urgent",
    date: format(new Date(), "yyyy-MM-dd"),
    gymId: "gym-fitzone-1",
    audience: "trainers"
  },
  {
    id: "notice-5",
    title: "Dumbbell Re-racking Policy",
    body: "Please remember to re-rack your weights after finishing your sets. Let's keep our gym floor clean, safe, and professional for everyone.",
    priority: "normal",
    date: format(subDays(new Date(), 5), "yyyy-MM-dd"),
    gymId: "gym-fitzone-1",
    audience: "everyone"
  }
];

// 11. Custom Diet Plans (Assigned to members by trainers)
export interface MealItem {
  name: string;
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
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

export const MOCK_DIET_PLANS: DietPlan[] = [
  {
    id: "diet-shred",
    title: "Lean Shred Plan",
    goal: "Weight Loss",
    dailyCalories: 1800,
    meals: {
      breakfast: [
        { name: "3 Scrambled Egg Whites & 1 Whole Egg", calories: 150, protein: 20, carbs: 1, fat: 5 },
        { name: "Oatmeal with water (50g) & Blueberries", calories: 200, protein: 7, carbs: 36, fat: 3 }
      ],
      lunch: [
        { name: "Grilled Chicken Breast (150g)", calories: 250, protein: 46, carbs: 0, fat: 4 },
        { name: "Brown Rice (100g) & Broccoli (100g)", calories: 150, protein: 4, carbs: 32, fat: 1 }
      ],
      dinner: [
        { name: "Baked Salmon Fillet (150g)", calories: 300, protein: 35, carbs: 0, fat: 16 },
        { name: "Mixed Leaf Salad with Lemon Dressing", calories: 50, protein: 1, carbs: 5, fat: 2 }
      ],
      snacks: [
        { name: "Whey Protein Shake (1 Scoop)", calories: 120, protein: 24, carbs: 2, fat: 1.5 },
        { name: "Almonds (15 nuts)", calories: 100, protein: 3, carbs: 3, fat: 9 }
      ]
    },
    assignedMemberId: "member-john",
    gymId: "gym-fitzone-1"
  },
  {
    id: "diet-bulk",
    title: "Muscle Bulk Plan",
    goal: "Weight Gain",
    dailyCalories: 3000,
    meals: {
      breakfast: [
        { name: "4 Whole Eggs & 2 Toast Slices", calories: 450, protein: 30, carbs: 30, fat: 22 },
        { name: "Large Banana & Peanut Butter (2 tbsp)", calories: 320, protein: 8, carbs: 35, fat: 16 }
      ],
      lunch: [
        { name: "Lean Ground Beef (200g)", calories: 400, protein: 42, carbs: 0, fat: 24 },
        { name: "White Rice (200g) & Asparagus", calories: 300, protein: 6, carbs: 65, fat: 1 }
      ],
      dinner: [
        { name: "Tuna Pasta with Olive Oil", calories: 600, protein: 45, carbs: 80, fat: 15 },
        { name: "Steamed Mixed Veggies", calories: 80, protein: 3, carbs: 15, fat: 0.5 }
      ],
      snacks: [
        { name: "Mass Gainer Shake with Whole Milk", calories: 650, protein: 40, carbs: 90, fat: 12 },
        { name: "Greek Yogurt (1 cup) with Honey", calories: 200, protein: 15, carbs: 20, fat: 4 }
      ]
    },
    assignedMemberId: "member-emily",
    gymId: "gym-fitzone-1"
  }
];

// 12. Custom Workout Plans (Assigned to members by trainers)
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
    [dayName: string]: Exercise[]; // e.g. "Monday", "Wednesday", "Friday"
  };
  assignedMemberId?: string;
  gymId: string;
}

export const MOCK_WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: "workout-ppl",
    title: "Push-Pull-Legs Split",
    goal: "Hypertrophy & Strength",
    daysPerWeek: 3,
    schedule: {
      "Monday (Push)": [
        { name: "Barbell Bench Press", sets: 4, reps: "8-10", restSeconds: 90, notes: "Control the eccentric phase" },
        { name: "Dumbbell Overhead Press", sets: 3, reps: "10-12", restSeconds: 60, notes: "Keep core tight, no leg drive" },
        { name: "Incline Dumbbell Flyes", sets: 3, reps: 12, restSeconds: 60, notes: "Focus on chest stretch" },
        { name: "Triceps Overhead Extension", sets: 3, reps: 15, restSeconds: 60, notes: "Keep elbows tucked in" }
      ],
      "Wednesday (Pull)": [
        { name: "Conventional Deadlifts", sets: 3, reps: "5", restSeconds: 120, notes: "Neutral spine, drive with legs" },
        { name: "Lat Pulldowns (Wide Grip)", sets: 3, reps: "10-12", restSeconds: 60, notes: "Squeeze shoulder blades" },
        { name: "Dumbbell Single-arm Rows", sets: 3, reps: "10 each", restSeconds: 60, notes: "Pull towards hip crease" },
        { name: "Incline Bicep Curls", sets: 3, reps: 12, restSeconds: 60, notes: "Full range of motion" }
      ],
      "Friday (Legs)": [
        { name: "Barbell Back Squats", sets: 4, reps: "8", restSeconds: 120, notes: "Squat to parallel or lower" },
        { name: "Romanian Deadlifts (RDL)", sets: 3, reps: "10-12", restSeconds: 90, notes: "Hinge hips back, feel hamstrings" },
        { name: "Leg Press", sets: 3, reps: 15, restSeconds: 60, notes: "Do not lock knees at the top" },
        { name: "Standing Calf Raises", sets: 4, reps: 20, restSeconds: 45, notes: "Hold stretch at the bottom" }
      ]
    },
    assignedMemberId: "member-john",
    gymId: "gym-fitzone-1"
  },
  {
    id: "workout-shred",
    title: "Fat Burning HIIT & Cardio",
    goal: "Weight Loss",
    daysPerWeek: 4,
    schedule: {
      "Monday (HIIT Circuit)": [
        { name: "Kettlebell Swings", sets: 3, reps: "45s on / 15s off", restSeconds: 60, notes: "Explosive hip drive" },
        { name: "Burpees", sets: 3, reps: "45s on / 15s off", restSeconds: 60, notes: "Chest to floor, jump at top" },
        { name: "Mountain Climbers", sets: 3, reps: "45s on / 15s off", restSeconds: 60, notes: "Drive knees fast" },
        { name: "Plank Hold", sets: 3, reps: "1 minute", restSeconds: 45, notes: "Solid bridge posture" }
      ],
      "Tuesday (LISS Cardio)": [
        { name: "Incline Treadmill Walk", sets: 1, reps: "45 mins", restSeconds: 0, notes: "12% incline, 4.5 km/h" }
      ],
      "Thursday (Upper Body Strength)": [
        { name: "Push Ups", sets: 3, reps: "Max", restSeconds: 45, notes: "Tight core" },
        { name: "Dumbbell Goblet Squats", sets: 3, reps: "15", restSeconds: 60, notes: "Hold heavy dumbbell at chest" },
        { name: "Cable Pulldowns", sets: 3, reps: "12", restSeconds: 60, notes: "Squeeze lats" }
      ],
      "Friday (HIIT Core)": [
        { name: "Bicycle Crunches", sets: 3, reps: "25 each", restSeconds: 30, notes: "Elbow to opposite knee" },
        { name: "Hanging Leg Raises", sets: 3, reps: "12", restSeconds: 45, notes: "Controlled raise and descent" },
        { name: "Russian Twists", sets: 3, reps: "30 each", restSeconds: 30, notes: "Use 5kg medicine ball" }
      ]
    },
    assignedMemberId: "member-emily",
    gymId: "gym-fitzone-1"
  }
];

// 13. Monthly Revenue data for 12 Months (used for platform stats and charts)
export const MOCK_MONTHLY_REVENUE = [
  { month: "Jun", revenue: 4200 },
  { month: "Jul", revenue: 4500 },
  { month: "Aug", revenue: 4800 },
  { month: "Sep", revenue: 5200 },
  { month: "Oct", revenue: 5800 },
  { month: "Nov", revenue: 6100 },
  { month: "Dec", revenue: 6700 },
  { month: "Jan", revenue: 7300 },
  { month: "Feb", revenue: 7900 },
  { month: "Mar", revenue: 8400 },
  { month: "Apr", revenue: 9100 },
  { month: "May", revenue: 9800 }
];

export const MOCK_ENQUIRIES: Enquiry[] = [
  {
    id: "enq-1",
    name: "Alex Johnson",
    phone: "+1 (555) 901-2345",
    email: "alex.j@example.com",
    description: "Interested in personal training packages and premium quarterly plan. Wants a morning slot.",
    gymId: "gym-fitzone-1",
    date: format(subDays(new Date(), 3), "yyyy-MM-dd"),
    messageSent: true,
    sentMessageText: "Hi Alex Johnson, thank you for visiting FitZone Downtown! We look forward to helping you reach your fitness goals. - Team FitZone Downtown"
  },
  {
    id: "enq-2",
    name: "Maria Garcia",
    phone: "+1 (555) 345-6789",
    email: "maria.g@example.com",
    description: "Enquired about ladies-only batches and yoga sessions schedule.",
    gymId: "gym-fitzone-1",
    date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    messageSent: true,
    sentMessageText: "Hi Maria Garcia, thank you for visiting FitZone Downtown! We look forward to helping you reach your fitness goals. - Team FitZone Downtown"
  },
  {
    id: "enq-3",
    name: "David Miller",
    phone: "+1 (555) 876-5432",
    email: "david.m@example.com",
    description: "Looking for a student discount on the annual plan. Will join next week.",
    gymId: "gym-fitzone-1",
    date: format(new Date(), "yyyy-MM-dd"),
    messageSent: false
  }
];

// 14. Expense Categories
export const EXPENSE_CATEGORIES: string[] = [
  "Rent",
  "Electricity/Utility",
  "Staff Salary",
  "Maintenance & Repairs",
  "Marketing & Promotions",
  "Equipment Purchase",
  "Supplement/Beverage Stock",
  "Other Expenses"
];

// 15. Expenses
export const MOCK_EXPENSES: Expense[] = [];

// 16. Feedbacks
export const MOCK_FEEDBACKS: Feedback[] = [];

// 17. Plan Upgrade Requests
export const MOCK_PLAN_UPGRADE_REQUESTS: PlanUpgradeRequest[] = [];

