import { Gym, GymOwner, SubscriptionPlan, Member, Trainer, AttendanceRecord, Invoice, MemberPlan, Notice, Enquiry, Expense, Feedback, PlanUpgradeRequest } from '../types';
import { subDays, format, subMonths } from 'date-fns';

// 1. Subscription tiers sold to Gym Owners by Super Admin (in INR)
export const MOCK_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "sub-lite",
    name: "Starter Lite",
    price: 2499,
    maxMembers: 50,
    maxTrainers: 3,
    durationDays: 30,
    features: ["Basic QR Attendance", "Up to 50 Members", "3 Trainer Logins", "Email Support", "Digital Member Directory"],
    isHighlighted: false,
    isActive: true
  },
  {
    id: "sub-standard",
    name: "Growth Standard",
    price: 4999,
    maxMembers: 250,
    maxTrainers: 10,
    durationDays: 90,
    features: ["Standard QR & Biometric Attendance", "Up to 250 Members", "10 Trainer Logins", "GST Invoicing & Reminders", "Progress Photo Timeline", "WhatsApp Announcements", "Priority Support"],
    isHighlighted: true,
    isActive: true
  },
  {
    id: "sub-pro",
    name: "Enterprise Pro",
    price: 14999,
    maxMembers: 1000,
    maxTrainers: 30,
    durationDays: 365,
    features: ["All Standard Features", "Up to 1000 Members", "30 Trainer Logins", "Locked Reception Kiosk Mode", "Multi-Gym Branch Routing", "Automated GST Reports", "Excel / CSV Data Export", "24/7 Dedicated Account Manager"],
    isHighlighted: false,
    isActive: true
  }
];

// 2. Gym Owners (including multi-gym, active, trial, and expired owners)
export const MOCK_OWNERS: GymOwner[] = [
  {
    id: "owner-active-1",
    name: "Rajesh Singhania",
    email: "owner@fitzone.com", // owner@fitzone.com / Owner@123
    phone: "+91 98230 45678",
    gymIds: ["gym-fitzone-1", "gym-fitzone-2"], // Multi-gym owner in Nagpur
    planId: "sub-standard",
    status: "active",
    trialStartDate: subDays(new Date(), 30).toISOString(),
    trialDaysRemaining: 0
  },
  {
    id: "owner-active-2",
    name: "Pooja Deshmukh",
    email: "pooja@irontemple.com",
    phone: "+91 98220 12345",
    gymIds: ["gym-irontemple"],
    planId: "sub-pro",
    status: "active",
    trialStartDate: subDays(new Date(), 45).toISOString(),
    trialDaysRemaining: 0
  },
  {
    id: "owner-trial",
    name: "Tarun Verma",
    email: "tarun@cardiohub.com",
    phone: "+91 98450 67890",
    gymIds: ["gym-cardiohub"],
    planId: undefined, // On 7-day trial
    status: "trial",
    trialStartDate: subDays(new Date(), 4).toISOString(), // 4 days ago. 3 remaining
    trialDaysRemaining: 3
  },
  {
    id: "owner-expired",
    name: "Jaideep Mukherjee",
    email: "jaideep@muscleworld.com",
    phone: "+91 98300 98765",
    gymIds: ["gym-muscleworld"],
    planId: undefined,
    status: "expired",
    trialStartDate: subDays(new Date(), 10).toISOString(),
    trialDaysRemaining: 0
  }
];

// 3. Gyms
export const MOCK_GYMS: Gym[] = [
  {
    id: "gym-fitzone-1",
    name: "FitZone Elite",
    ownerId: "owner-active-1",
    addressLine1: "Plot 42, Civil Lines",
    addressLine2: "Opposite High Court",
    city: "Nagpur",
    state: "MH",
    pin: "440001",
    phone: "+91 712 255 4321",
    email: "civillines@fitzone.in",
    logoUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
    gstNumber: "27AABCS1429B1Z8",
    website: "https://fitzone.in",
    status: "active"
  },
  {
    id: "gym-fitzone-2",
    name: "FitZone Studio",
    ownerId: "owner-active-1",
    addressLine1: "15 West High Court Road",
    addressLine2: "Dharampeth",
    city: "Nagpur",
    state: "MH",
    pin: "440010",
    phone: "+91 712 254 8890",
    email: "dharampeth@fitzone.in",
    logoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop",
    gstNumber: "27AABCS1429B2Z7",
    website: "https://fitzone.in",
    status: "active"
  },
  {
    id: "gym-irontemple",
    name: "Iron Temple Gym",
    ownerId: "owner-active-2",
    addressLine1: "Paud Road, Near MIT College",
    city: "Pune",
    state: "MH",
    pin: "411038",
    phone: "+91 20 2544 1122",
    email: "pune@irontemple.in",
    logoUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&h=200&fit=crop",
    gstNumber: "27AABCI9988C1Z4",
    website: "https://irontemple.in",
    status: "active"
  },
  {
    id: "gym-cardiohub",
    name: "Cardio Hub (Trial)",
    ownerId: "owner-trial",
    addressLine1: "100 Feet Road, Indiranagar",
    city: "Bengaluru",
    state: "KA",
    pin: "560038",
    phone: "+91 80 4123 4567",
    email: "bengaluru@cardiohub.in",
    logoUrl: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=200&h=200&fit=crop",
    gstNumber: "",
    website: "",
    status: "trial"
  },
  {
    id: "gym-muscleworld",
    name: "Muscle World (Expired)",
    ownerId: "owner-expired",
    addressLine1: "Salt Lake Sector V",
    city: "Kolkata",
    state: "WB",
    pin: "700091",
    phone: "+91 33 2357 8900",
    email: "kolkata@muscleworld.in",
    logoUrl: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=200&h=200&fit=crop",
    gstNumber: "",
    website: "",
    status: "expired"
  }
];

// 4. Member Plans (sold by Gym Owners to Gym Members in INR)
export const MOCK_MEMBER_PLANS: MemberPlan[] = [
  {
    id: "mplan-fit-monthly",
    name: "Standard Monthly",
    durationDays: 30,
    price: 2500,
    features: ["All Cardio & Strength Areas", "Locker Room & Steam Access", "1 Free Trainer Orientation"],
    colorTag: "#6C47FF",
    isPopular: false,
    gymId: "gym-fitzone-1",
    currency: "INR"
  },
  {
    id: "mplan-fit-monthly-2",
    name: "Standard Monthly",
    durationDays: 30,
    price: 2500,
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
    price: 6500,
    features: ["Standard Access", "Group Exercise & Yoga Classes", "Custom Indian Diet Blueprint", "2 Guest Passes/Month"],
    colorTag: "#00C896",
    isPopular: true,
    gymId: "gym-fitzone-1",
    currency: "INR"
  },
  {
    id: "mplan-fit-annual",
    name: "VIP Elite Annual",
    durationDays: 365,
    price: 18000,
    features: ["Full Access to all FitZone branches", "Personal Trainer (2 sessions/mo)", "Steam & Sauna Facility", "Unlimited Group Classes", "Free FitZone Gym Kit"],
    colorTag: "#FF6B35",
    isPopular: false,
    gymId: "gym-fitzone-1",
    currency: "INR"
  },
  {
    id: "mplan-iron-monthly",
    name: "Heavy Lifter Monthly",
    durationDays: 30,
    price: 3500,
    features: ["24/7 Access", "Chalk Allowed", "Olympic Lifting Platform", "Sauna & Ice Bath"],
    colorTag: "#6C47FF",
    isPopular: true,
    gymId: "gym-irontemple",
    currency: "INR"
  }
];

// 5. Trainers
export const MOCK_TRAINERS: Trainer[] = [
  {
    id: "trainer-1",
    name: "Vikram Rathore",
    email: "trainer@fitzone.com", // trainer@fitzone.com / Trainer@123
    phone: "+91 98234 56789",
    specialization: "Hypertrophy & Strength Conditioning",
    schedule: "06:00 AM - 02:00 PM",
    gymId: "gym-fitzone-1",
    memberIds: ["member-john", "member-emily", "member-david", "member-brian"]
  },
  {
    id: "trainer-2",
    name: "Anjali Menon",
    email: "anjali@fitzone.com",
    phone: "+91 98221 65432",
    specialization: "Weight Loss, Pilates & Functional Core",
    schedule: "02:00 PM - 10:00 PM",
    gymId: "gym-fitzone-1",
    memberIds: ["member-sarah", "member-jessica", "member-pending-alice"]
  },
  {
    id: "trainer-3",
    name: "Devendra Rao",
    email: "devendra@fitzone.com",
    phone: "+91 99701 43210",
    specialization: "Olympic Lifting & Powerlifting",
    schedule: "09:00 AM - 05:00 PM",
    gymId: "gym-fitzone-1",
    memberIds: ["member-lucas", "member-inactive-chris"]
  },
  {
    id: "trainer-iron-1",
    name: "Kabir Khan",
    email: "kabir@irontemple.in",
    phone: "+91 98210 98765",
    specialization: "CrossFit & Strongman Training",
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

// 7. Members (Realistic Indian profiles across Nagpur & branches)
export const MOCK_MEMBERS: Member[] = [
  {
    id: "member-john",
    name: "Arjun Mehta",
    email: "john@member.com", // john@member.com / Member@123
    phone: "+91 98234 11223",
    dob: "1996-05-14",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 15).toISOString(),
    endDate: subDays(new Date(), -15).toISOString(), // Active, expires in 15 days
    status: "active",
    assignedTrainerId: "trainer-1",
    gymId: "gym-fitzone-1",
    gender: "Male",
    membershipId: "SG-MH-0101",
    batch: "Morning (06:30 AM - 08:00 AM)",
    joiningDate: format(subDays(new Date(), 15), "yyyy-MM-dd"),
    bodyStatsLog: generateBodyStats(82.0, 25.8),
    progressPhotos: generateProgressPhotos()
  },
  {
    id: "member-emily",
    name: "Sneha Kulkarni",
    email: "sneha@member.com",
    phone: "+91 98221 44556",
    dob: "1998-03-24",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
    planId: "mplan-fit-quarterly",
    startDate: subDays(new Date(), 70).toISOString(),
    endDate: subDays(new Date(), -20).toISOString(), // Active, expires in 20 days
    status: "active",
    assignedTrainerId: "trainer-1",
    gymId: "gym-fitzone-1",
    gender: "Female",
    membershipId: "SG-MH-0102",
    batch: "Morning (08:00 AM - 09:30 AM)",
    joiningDate: format(subDays(new Date(), 70), "yyyy-MM-dd"),
    bodyStatsLog: generateBodyStats(59.0, 20.4),
    progressPhotos: generateProgressPhotos()
  },
  {
    id: "member-sarah",
    name: "Priya Sharma",
    email: "priya@member.com",
    phone: "+91 98110 44332",
    dob: "1995-11-02",
    photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 28).toISOString(),
    endDate: subDays(new Date(), -2).toISOString(), // Active, expires in 2 days (Reminder banner trigger!)
    status: "active",
    assignedTrainerId: "trainer-2",
    gymId: "gym-fitzone-1",
    gender: "Female",
    membershipId: "SG-MH-0103",
    batch: "Evening (05:30 PM - 07:00 PM)",
    joiningDate: format(subDays(new Date(), 28), "yyyy-MM-dd"),
    bodyStatsLog: generateBodyStats(64.0, 21.8),
    progressPhotos: generateProgressPhotos()
  },
  {
    id: "member-expired-bob",
    name: "Rohan Verma",
    email: "rohan@member.com",
    phone: "+91 99701 55667",
    dob: "1991-08-12",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 45).toISOString(),
    endDate: subDays(new Date(), 15).toISOString(), // Expired 15 days ago
    status: "expired",
    assignedTrainerId: undefined,
    gymId: "gym-fitzone-1",
    gender: "Male",
    membershipId: "SG-MH-0104",
    batch: "Evening (07:00 PM - 08:30 PM)",
    joiningDate: format(subDays(new Date(), 45), "yyyy-MM-dd"),
    bodyStatsLog: generateBodyStats(91.0, 28.5),
    progressPhotos: []
  },
  {
    id: "member-david",
    name: "Amit Patel",
    email: "amit@member.com",
    phone: "+91 98200 99881",
    dob: "1994-12-05",
    photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop",
    planId: "mplan-fit-annual",
    startDate: subDays(new Date(), 120).toISOString(),
    endDate: subDays(new Date(), -245).toISOString(), // Active VIP member
    status: "active",
    assignedTrainerId: "trainer-1",
    gymId: "gym-fitzone-1",
    gender: "Male",
    membershipId: "SG-MH-0105",
    batch: "Morning (06:00 AM - 07:30 AM)",
    joiningDate: format(subDays(new Date(), 120), "yyyy-MM-dd"),
    bodyStatsLog: generateBodyStats(76.5, 24.2),
    progressPhotos: []
  },
  {
    id: "member-jessica",
    name: "Ananya Iyer",
    email: "ananya@member.com",
    phone: "+91 97654 33221",
    dob: "1997-04-18",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
    planId: "mplan-fit-quarterly",
    startDate: subDays(new Date(), 10).toISOString(),
    endDate: subDays(new Date(), -80).toISOString(),
    status: "active",
    assignedTrainerId: "trainer-2",
    gymId: "gym-fitzone-1",
    gender: "Female",
    membershipId: "SG-MH-0106",
    batch: "Evening (06:00 PM - 07:30 PM)",
    joiningDate: format(subDays(new Date(), 10), "yyyy-MM-dd"),
    bodyStatsLog: generateBodyStats(54.0, 19.1),
    progressPhotos: []
  },
  {
    id: "member-brian",
    name: "Vikramaditya Patil",
    email: "vikram.patil@member.com",
    phone: "+91 98230 11998",
    dob: "1993-10-30",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop",
    planId: "mplan-fit-annual",
    startDate: subDays(new Date(), 50).toISOString(),
    endDate: subDays(new Date(), -315).toISOString(),
    status: "active",
    assignedTrainerId: "trainer-1",
    gymId: "gym-fitzone-1",
    gender: "Male",
    membershipId: "SG-MH-0107",
    batch: "Morning (07:00 AM - 08:30 AM)",
    joiningDate: format(subDays(new Date(), 50), "yyyy-MM-dd"),
    bodyStatsLog: generateBodyStats(85.0, 26.5),
    progressPhotos: []
  },
  {
    id: "member-pending-alice",
    name: "Kavita Choudhary",
    email: "kavita@member.com",
    phone: "+91 94221 88776",
    dob: "2000-01-14",
    photoUrl: undefined,
    planId: "mplan-fit-monthly",
    startDate: new Date().toISOString(),
    endDate: subDays(new Date(), -30).toISOString(),
    status: "pending", // Pending activation
    assignedTrainerId: "trainer-2",
    gymId: "gym-fitzone-1",
    gender: "Female",
    membershipId: "SG-MH-0108",
    batch: "Morning (09:00 AM - 10:30 AM)",
    joiningDate: format(new Date(), "yyyy-MM-dd"),
    bodyStatsLog: [],
    progressPhotos: []
  },
  {
    id: "member-inactive-chris",
    name: "Rahul Nair",
    email: "rahul.nair@member.com",
    phone: "+91 98450 12345",
    dob: "1989-05-19",
    photoUrl: undefined,
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 100).toISOString(),
    endDate: subDays(new Date(), -265).toISOString(),
    status: "inactive", // Voluntarily frozen / paused
    assignedTrainerId: "trainer-3",
    gymId: "gym-fitzone-1",
    gender: "Male",
    membershipId: "SG-MH-0109",
    batch: "Evening (08:00 PM - 09:30 PM)",
    joiningDate: format(subDays(new Date(), 100), "yyyy-MM-dd"),
    bodyStatsLog: [],
    progressPhotos: []
  },
  {
    id: "member-lucas",
    name: "Aditya Mishra",
    email: "aditya.m@member.com",
    phone: "+91 99341 67890",
    dob: "1995-09-08",
    photoUrl: undefined,
    planId: "mplan-fit-monthly",
    startDate: subDays(new Date(), 10).toISOString(),
    endDate: subDays(new Date(), -20).toISOString(),
    status: "active",
    assignedTrainerId: "trainer-3",
    gymId: "gym-fitzone-1",
    gender: "Male",
    membershipId: "SG-MH-0110",
    batch: "Morning (06:00 AM - 07:30 AM)",
    joiningDate: format(subDays(new Date(), 10), "yyyy-MM-dd"),
    bodyStatsLog: generateBodyStats(78, 24.6),
    progressPhotos: []
  },
  {
    id: "member-brooklyn-1",
    name: "Neha Gupta",
    email: "neha.gupta@member.com",
    phone: "+91 98101 23456",
    dob: "1996-08-20",
    planId: "mplan-fit-monthly-2",
    startDate: subDays(new Date(), 12).toISOString(),
    endDate: subDays(new Date(), -18).toISOString(),
    status: "active",
    gymId: "gym-fitzone-2",
    gender: "Female",
    membershipId: "SG-MH-0201",
    batch: "Evening (06:30 PM - 08:00 PM)",
    joiningDate: format(subDays(new Date(), 12), "yyyy-MM-dd"),
    bodyStatsLog: [],
    progressPhotos: []
  },
  {
    id: "member-11",
    name: "Harpreet Singh",
    email: "harpreet.s@member.com",
    phone: "+91 98765 43210",
    dob: "1992-02-14",
    photoUrl: undefined,
    planId: "mplan-fit-annual",
    startDate: subDays(new Date(), 40).toISOString(),
    endDate: subDays(new Date(), -325).toISOString(),
    status: "active",
    assignedTrainerId: "trainer-1",
    gymId: "gym-fitzone-1",
    gender: "Male",
    membershipId: "SG-MH-0111",
    batch: "Morning (07:30 AM - 09:00 AM)",
    joiningDate: format(subDays(new Date(), 40), "yyyy-MM-dd"),
    bodyStatsLog: generateBodyStats(88, 27.2),
    progressPhotos: []
  },
  {
    id: "member-12",
    name: "Meera Nambiar",
    email: "meera.n@member.com",
    phone: "+91 98451 98765",
    dob: "1997-07-22",
    photoUrl: undefined,
    planId: "mplan-fit-quarterly",
    startDate: subDays(new Date(), 25).toISOString(),
    endDate: subDays(new Date(), -65).toISOString(),
    status: "active",
    assignedTrainerId: "trainer-2",
    gymId: "gym-fitzone-1",
    gender: "Female",
    membershipId: "SG-MH-0112",
    batch: "Morning (08:30 AM - 10:00 AM)",
    joiningDate: format(subDays(new Date(), 25), "yyyy-MM-dd"),
    bodyStatsLog: [],
    progressPhotos: []
  }
];

// 8. 30 Days of Attendance Records (Generated with Indian names and check-in times)
const generateAttendanceData = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const memberList = [
    { id: "member-john", name: "Arjun Mehta" },
    { id: "member-emily", name: "Sneha Kulkarni" },
    { id: "member-sarah", name: "Priya Sharma" },
    { id: "member-david", name: "Amit Patel" },
    { id: "member-jessica", name: "Ananya Iyer" },
    { id: "member-brian", name: "Vikramaditya Patil" },
    { id: "member-lucas", name: "Aditya Mishra" },
    { id: "member-11", name: "Harpreet Singh" }
  ];
  const gymId = "gym-fitzone-1";
  
  for (let i = 0; i < 30; i++) {
    const currentDate = subDays(new Date(), i);
    const dateStr = format(currentDate, "yyyy-MM-dd");
    
    // Pick 3-5 members who attended that day
    const attendees = memberList.filter((_, idx) => (i + idx) % 2 === 0 || (idx === 0 && i % 3 !== 0));
    attendees.forEach((attendee, idx) => {
      const hour = 6 + (idx % 4) * 2;
      const min = (idx * 17) % 60;
      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      
      const checkOutHour = hour + 1;
      const checkOutMin = (min + 25) % 60;
      const checkOutTimeStr = `${checkOutHour.toString().padStart(2, '0')}:${checkOutMin.toString().padStart(2, '0')}`;
      const durationMins = (checkOutHour - hour) * 60 + (checkOutMin - min);

      records.push({
        id: `att-${dateStr}-${attendee.id}`,
        memberId: attendee.id,
        userName: attendee.name,
        role: 'member',
        gymId,
        date: dateStr,
        checkInTime: timeStr,
        checkOutTime: checkOutTimeStr,
        status: 'checked_out',
        duration: durationMins,
        scannedBy: "trainer-1",
        method: idx % 3 === 0 ? "qr" : "manual"
      });
    });
  }
  
  return records;
};

export const MOCK_ATTENDANCE: AttendanceRecord[] = generateAttendanceData();

// 9. Invoices (Priced in INR with 18% GST calculation, installments and platform invoices)
export const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv-001",
    invoiceNo: "INV-2026-001",
    memberId: "member-john",
    memberName: "Arjun Mehta",
    planName: "Standard Monthly Plan",
    amount: 2950.00,
    date: format(subDays(new Date(), 15), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -15), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 2500.00,
    tax: 450.00, // 18% GST
    addOns: 0.00,
    total: 2950.00,
    gymId: "gym-fitzone-1",
    currency: "INR",
    paymentMethod: "UPI (Google Pay)"
  },
  {
    id: "inv-002",
    invoiceNo: "INV-2026-002",
    memberId: "member-emily",
    memberName: "Sneha Kulkarni",
    planName: "Premium Quarterly Plan",
    amount: 7670.00,
    date: format(subDays(new Date(), 70), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -20), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 6500.00,
    tax: 1170.00,
    addOns: 0.00,
    total: 7670.00,
    gymId: "gym-fitzone-1",
    currency: "INR",
    paymentMethod: "Debit Card"
  },
  {
    id: "inv-003",
    invoiceNo: "INV-2026-003",
    memberId: "member-sarah",
    memberName: "Priya Sharma",
    planName: "Standard Monthly Plan",
    amount: 2950.00,
    date: format(subDays(new Date(), 28), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -2), "yyyy-MM-dd"),
    status: "pending",
    subtotal: 2500.00,
    tax: 450.00,
    addOns: 0.00,
    total: 2950.00,
    gymId: "gym-fitzone-1",
    currency: "INR",
    hasInstallments: true,
    firstInstallmentAmount: 1475.00,
    firstInstallmentStatus: "paid",
    secondInstallmentAmount: 1475.00,
    secondInstallmentStatus: "pending",
    secondInstallmentDueDate: format(subDays(new Date(), -5), "yyyy-MM-dd"),
    paymentMethod: "UPI (PhonePe)"
  },
  {
    id: "inv-004",
    invoiceNo: "INV-2026-004",
    memberId: "member-expired-bob",
    memberName: "Rohan Verma",
    planName: "Standard Monthly Plan",
    amount: 2950.00,
    date: format(subDays(new Date(), 45), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), 15), "yyyy-MM-dd"),
    status: "overdue",
    subtotal: 2500.00,
    tax: 450.00,
    addOns: 0.00,
    total: 2950.00,
    gymId: "gym-fitzone-1",
    currency: "INR",
    hasInstallments: true,
    firstInstallmentAmount: 1475.00,
    firstInstallmentStatus: "paid",
    secondInstallmentAmount: 1475.00,
    secondInstallmentStatus: "pending",
    secondInstallmentDueDate: format(subDays(new Date(), 5), "yyyy-MM-dd")
  },
  {
    id: "inv-005",
    invoiceNo: "INV-2026-005",
    memberId: "member-david",
    memberName: "Amit Patel",
    planName: "VIP Elite Annual Plan",
    amount: 21240.00,
    date: format(subDays(new Date(), 120), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -245), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 18000.00,
    tax: 3240.00,
    addOns: 0.00,
    total: 21240.00,
    gymId: "gym-fitzone-1",
    currency: "INR",
    paymentMethod: "Net Banking"
  },
  {
    id: "inv-006",
    invoiceNo: "INV-2026-006",
    memberId: "member-brian",
    memberName: "Vikramaditya Patil",
    planName: "VIP Elite Annual Plan",
    amount: 21240.00,
    date: format(subDays(new Date(), 50), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -315), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 18000.00,
    tax: 3240.00,
    addOns: 0.00,
    total: 21240.00,
    gymId: "gym-fitzone-1",
    currency: "INR",
    paymentMethod: "Credit Card"
  },
  {
    id: "inv-007",
    invoiceNo: "INV-2026-007",
    memberId: "member-jessica",
    memberName: "Ananya Iyer",
    planName: "Premium Quarterly Plan",
    amount: 7670.00,
    date: format(subDays(new Date(), 10), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -80), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 6500.00,
    tax: 1170.00,
    addOns: 0.00,
    total: 7670.00,
    gymId: "gym-fitzone-1",
    currency: "INR",
    paymentMethod: "UPI (Paytm)"
  },
  {
    id: "inv-008",
    invoiceNo: "INV-2026-008",
    memberId: "member-pending-alice",
    memberName: "Kavita Choudhary",
    planName: "Standard Monthly Plan",
    amount: 2950.00,
    date: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), -7), "yyyy-MM-dd"),
    status: "pending",
    subtotal: 2500.00,
    tax: 450.00,
    addOns: 0.00,
    total: 2950.00,
    gymId: "gym-fitzone-1",
    currency: "INR"
  },
  // Platform Subscription Invoices (Super Admin billing to Gym Owners)
  {
    id: "inv-owner-01",
    invoiceNo: "SA-SUB-2026-01",
    memberId: "owner-active-1",
    memberName: "Rajesh Singhania",
    planName: "Growth Standard (Quarterly)",
    amount: 5898.82,
    date: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), 23), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 4999.00,
    tax: 899.82,
    addOns: 0.00,
    total: 5898.82,
    gymId: "gym-fitzone-1",
    currency: "INR",
    paymentMethod: "Razorpay Corporate"
  },
  {
    id: "inv-owner-02",
    invoiceNo: "SA-SUB-2026-02",
    memberId: "owner-active-2",
    memberName: "Pooja Deshmukh",
    planName: "Enterprise Pro (Annual)",
    amount: 17698.82,
    date: format(subDays(new Date(), 45), "yyyy-MM-dd"),
    dueDate: format(subDays(new Date(), 38), "yyyy-MM-dd"),
    status: "paid",
    subtotal: 14999.00,
    tax: 2699.82,
    addOns: 0.00,
    total: 17698.82,
    gymId: "gym-irontemple",
    currency: "INR",
    paymentMethod: "Bank NEFT Transfer"
  }
];

// 10. Notices (Authentic Indian gym announcements & etiquette)
export const MOCK_NOTICES: Notice[] = [
  {
    id: "notice-1",
    title: "Diwali & Navratri Festival Timings",
    body: "Please note that on festival days, the gym will operate in the morning shift from 06:00 AM to 01:00 PM only. Wishing all our members and their families health, strength, and prosperity! Regular group Zumba and Yoga batches resume next Wednesday.",
    priority: "normal",
    date: format(subDays(new Date(), 2), "yyyy-MM-dd"),
    gymId: "gym-fitzone-1",
    audience: "everyone"
  },
  {
    id: "notice-2",
    title: "Steam Bath & Sauna Boiler Maintenance",
    body: "The steam sauna room will undergo scheduled descale cleaning and pressure valve maintenance this Thursday. We apologize for the temporary inconvenience and expect full service restoration by Friday 06:00 AM.",
    priority: "urgent",
    date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    gymId: "gym-fitzone-1",
    audience: "members"
  },
  {
    id: "notice-3",
    title: "Olympic Lifting & Power Clean Workshop",
    body: "Head Coach Vikram Rathore will conduct an interactive Olympic Weightlifting & Clean-and-Jerk technique clinic this Sunday at 10:00 AM. Free registration for all active FitZone members at the reception counter.",
    priority: "normal",
    date: format(new Date(), "yyyy-MM-dd"),
    gymId: "gym-fitzone-1",
    audience: "members"
  },
  {
    id: "notice-4",
    title: "Trainer Team Monthly Review Meeting",
    body: "Reminder to all floor coaches and trainers: Monthly client progress evaluation, PT scheduling, and member goal reviews will take place this Saturday at 03:00 PM in the staff conference lounge.",
    priority: "urgent",
    date: format(new Date(), "yyyy-MM-dd"),
    gymId: "gym-fitzone-1",
    audience: "trainers"
  },
  {
    id: "notice-5",
    title: "Gym Floor Hygiene & Towel Etiquette",
    body: "Dear members, please carry a personal sweat towel at all times and wipe down benches after heavy sets. Also kindly re-rack dumbbells and Olympic bumper plates after your workout. Let's keep our gym floor clean, hygienic, and safe for everyone.",
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
    title: "Indian Lean Muscle Shred Plan",
    goal: "Weight Loss",
    dailyCalories: 1850,
    meals: {
      breakfast: [
        { name: "3 Egg Whites Bhurji with Green Chillies & 1 Multigrain Roti", calories: 190, protein: 22, carbs: 18, fat: 4 },
        { name: "Rolled Oats cooked in Skimmed Milk with Chia Seeds & Almonds (6)", calories: 220, protein: 9, carbs: 36, fat: 5 }
      ],
      lunch: [
        { name: "Grilled Chicken Breast (160g) with Jeera Brown Rice (100g)", calories: 350, protein: 46, carbs: 32, fat: 5 },
        { name: "Yellow Moong Dal Tadka (1 bowl) with Cucumber & Tomato Salad", calories: 160, protein: 9, carbs: 22, fat: 3 }
      ],
      dinner: [
        { name: "Pan-seared Low-fat Paneer (150g) with Sauteed Capsicum & Broccoli", calories: 280, protein: 30, carbs: 9, fat: 12 },
        { name: "1 Jowar / Bajra Roti with Mint Raita", calories: 140, protein: 5, carbs: 24, fat: 3 }
      ],
      snacks: [
        { name: "1 Scoop Whey Protein Isolate in Water", calories: 120, protein: 26, carbs: 2, fat: 1 },
        { name: "Roasted Chana & Sprouted Moong Chaat (60g)", calories: 160, protein: 9, carbs: 24, fat: 2 }
      ]
    },
    assignedMemberId: "member-john",
    gymId: "gym-fitzone-1"
  },
  {
    id: "diet-bulk",
    title: "High-Protein Indian Muscle Gain Plan",
    goal: "Weight Gain",
    dailyCalories: 2950,
    meals: {
      breakfast: [
        { name: "4 Boiled Eggs (2 Whole + 2 Whites) & 2 Peanut Butter Toasts", calories: 480, protein: 30, carbs: 40, fat: 22 },
        { name: "Banana, Oats & Honey High-Protein Milk Smoothie", calories: 340, protein: 14, carbs: 58, fat: 6 }
      ],
      lunch: [
        { name: "Chicken Curry in Olive Oil (200g) with Steamed Basmati Rice (150g)", calories: 540, protein: 50, carbs: 58, fat: 14 },
        { name: "Mixed Vegetable Salad with Fresh Curd (Dahi) & Flaxseeds", calories: 150, protein: 7, carbs: 14, fat: 6 }
      ],
      dinner: [
        { name: "Soya Chunks Masala Curry (90g raw) with 2 Wholewheat Rotis", calories: 490, protein: 52, carbs: 52, fat: 8 },
        { name: "Grilled Paneer Tikka with Lemon & Chaat Masala (100g)", calories: 260, protein: 18, carbs: 7, fat: 16 }
      ],
      snacks: [
        { name: "Whey Protein Shake with 1 Spoon Peanut Butter & Almonds", calories: 320, protein: 32, carbs: 14, fat: 14 },
        { name: "Handful of Walnuts, Roasted Makhana & Dry Fruits", calories: 220, protein: 6, carbs: 20, fat: 12 }
      ]
    },
    assignedMemberId: "member-emily",
    gymId: "gym-fitzone-1"
  },
  {
    id: "diet-veg-fit",
    title: "Pure Veg High-Protein Fit Plan",
    goal: "Maintenance",
    dailyCalories: 2200,
    meals: {
      breakfast: [
        { name: "Paneer & Besan Chilla (2) with Mint Coriander Chutney", calories: 320, protein: 24, carbs: 28, fat: 12 },
        { name: "Warm Lemon Honey Water & Soaked Badam (10)", calories: 120, protein: 4, carbs: 8, fat: 9 }
      ],
      lunch: [
        { name: "Soya Chunks Pulao with Raita & Mixed Greens Salad", calories: 450, protein: 38, carbs: 54, fat: 8 },
        { name: "Thick Masoor Dal (1.5 bowls)", calories: 210, protein: 14, carbs: 32, fat: 2 }
      ],
      dinner: [
        { name: "Tofu / Paneer Bhurji with 2 Phulkas & Steamed Beans", calories: 380, protein: 32, carbs: 34, fat: 14 },
        { name: "Roasted Jeera Curd Bowl", calories: 110, protein: 6, carbs: 8, fat: 5 }
      ],
      snacks: [
        { name: "Plant-based Pea Protein Shake with Soy Milk", calories: 180, protein: 28, carbs: 6, fat: 3 },
        { name: "Sprouted Kala Chana with Chopped Onion, Tomato & Lemon", calories: 160, protein: 10, carbs: 26, fat: 2 }
      ]
    },
    assignedMemberId: "member-david",
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
    [dayName: string]: Exercise[];
  };
  assignedMemberId?: string;
  gymId: string;
}

export const MOCK_WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: "workout-ppl",
    title: "5-Day Hypertrophy Push-Pull-Legs Split",
    goal: "Hypertrophy & Strength Conditioning",
    daysPerWeek: 3,
    schedule: {
      "Monday (Push: Chest, Shoulders, Triceps)": [
        { name: "Barbell Flat Bench Press", sets: 4, reps: "8-10", restSeconds: 90, notes: "Control eccentric, pause at sternum" },
        { name: "Standing Overhead Military Press", sets: 3, reps: "8-10", restSeconds: 75, notes: "Brace core tightly, full overhead lockout" },
        { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", restSeconds: 60, notes: "30-degree incline for upper chest emphasis" },
        { name: "Cable Lateral Raises", sets: 4, reps: "15", restSeconds: 45, notes: "Constant tension on lateral delts" },
        { name: "Triceps Rope Pushdown", sets: 3, reps: "12-15", restSeconds: 45, notes: "Spread rope apart at bottom peak" }
      ],
      "Wednesday (Pull: Back, Rear Delts, Biceps)": [
        { name: "Conventional Barbell Deadlifts", sets: 3, reps: "5", restSeconds: 120, notes: "Neutral spine, leg drive through floor" },
        { name: "Wide Grip Lat Pulldown", sets: 4, reps: "10-12", restSeconds: 60, notes: "Drive elbows down to ribcage" },
        { name: "Chest Supported T-Bar Row", sets: 3, reps: "10", restSeconds: 60, notes: "Squeeze shoulder blades for 1 second" },
        { name: "Face Pulls with Rope", sets: 4, reps: "15", restSeconds: 45, notes: "External rotator cuff activation" },
        { name: "Incline Dumbbell Bicep Curls", sets: 3, reps: "12", restSeconds: 60, notes: "Supinate wrists at top contraction" }
      ],
      "Friday (Legs: Quads, Hamstrings, Calves, Abs)": [
        { name: "Barbell Back Squats", sets: 4, reps: "8", restSeconds: 120, notes: "Squat below parallel, stay upright" },
        { name: "Romanian Deadlifts (RDL)", sets: 3, reps: "10", restSeconds: 90, notes: "Hinge hips back, feel hamstring stretch" },
        { name: "45-Degree Leg Press", sets: 3, reps: "12-15", restSeconds: 60, notes: "Do not lock knees at peak extension" },
        { name: "Standing Calf Raises", sets: 4, reps: "20", restSeconds: 45, notes: "2-second pause at full deep stretch" },
        { name: "Hanging Leg Raises", sets: 3, reps: "15", restSeconds: 45, notes: "Strict form, curl pelvis upward" }
      ]
    },
    assignedMemberId: "member-john",
    gymId: "gym-fitzone-1"
  },
  {
    id: "workout-shred",
    title: "Functional HIIT & Core Conditioning",
    goal: "Fat Loss & Aerobic Endurance",
    daysPerWeek: 4,
    schedule: {
      "Monday (HIIT Functional Circuit)": [
        { name: "Russian Kettlebell Swings", sets: 4, reps: "45s on / 15s off", restSeconds: 60, notes: "Explosive hip hinge, squeeze glutes" },
        { name: "Plyometric Box Jumps", sets: 4, reps: "12 reps", restSeconds: 60, notes: "Land softly with knees slightly bent" },
        { name: "Battle Ropes Alternating Waves", sets: 4, reps: "30s", restSeconds: 45, notes: "Maximum cadence high intensity" },
        { name: "Plank to Shoulder Taps", sets: 3, reps: "20 taps", restSeconds: 45, notes: "Minimize hip rotation" }
      ],
      "Tuesday (LISS Cardio & Active Recovery)": [
        { name: "Incline Treadmill Power Walk", sets: 1, reps: "40 mins", restSeconds: 0, notes: "10-12% incline at 5.2 km/h" },
        { name: "Foam Rolling & Hip Mobility Drills", sets: 1, reps: "15 mins", restSeconds: 0, notes: "Target quads, IT band, and glutes" }
      ],
      "Thursday (Upper Body Functional Strength)": [
        { name: "Strict Push-ups to Downward Dog", sets: 3, reps: "12", restSeconds: 45, notes: "Full range, press through chest" },
        { name: "Kettlebell Goblet Squats", sets: 3, reps: "15", restSeconds: 60, notes: "Hold heavy kettlebell at collarbone" },
        { name: "Dumbbell Renegade Rows", sets: 3, reps: "10 each", restSeconds: 60, notes: "Anti-rotational core stability" }
      ],
      "Friday (Core Blast & Tabata Finisher)": [
        { name: "Hanging Knee Tucks", sets: 3, reps: "15", restSeconds: 45, notes: "Controlled descent, avoid swinging" },
        { name: "Russian Twists with 5kg Medicine Ball", sets: 3, reps: "30", restSeconds: 30, notes: "Rotate through upper torso" },
        { name: "Bicycle Crunches", sets: 3, reps: "25 each", restSeconds: 30, notes: "Touch elbow to opposite knee" }
      ]
    },
    assignedMemberId: "member-emily",
    gymId: "gym-fitzone-1"
  },
  {
    id: "workout-strength",
    title: "Upper / Lower Strength Split",
    goal: "Powerlifting & Total Strength",
    daysPerWeek: 4,
    schedule: {
      "Monday (Lower Power)": [
        { name: "Heavy Barbell Squats", sets: 5, reps: "5", restSeconds: 150, notes: "80-85% 1RM, tight upper back" },
        { name: "Barbell Hip Thrusts", sets: 4, reps: "8-10", restSeconds: 90, notes: "Pause 2 seconds at top lockout" },
        { name: "Bulgarian Split Squats", sets: 3, reps: "10 each", restSeconds: 60, notes: "Deep knee bend on trailing leg" }
      ],
      "Tuesday (Upper Power)": [
        { name: "Competition Bench Press", sets: 5, reps: "5", restSeconds: 150, notes: "Tuck elbows, drive with legs" },
        { name: "Weighted Pull-ups", sets: 4, reps: "6-8", restSeconds: 90, notes: "Chest touches bar" },
        { name: "Standing Barbell Overhead Press", sets: 4, reps: "6", restSeconds: 90, notes: "Tight glutes and core" }
      ]
    },
    assignedMemberId: "member-david",
    gymId: "gym-fitzone-1"
  }
];

// 13. Monthly Revenue data for 12 Months (Priced in Indian Rupees ₹)
export const MOCK_MONTHLY_REVENUE = [
  { month: "Jun", revenue: 185000 },
  { month: "Jul", revenue: 210000 },
  { month: "Aug", revenue: 245000 },
  { month: "Sep", revenue: 290000 },
  { month: "Oct", revenue: 340000 },
  { month: "Nov", revenue: 385000 },
  { month: "Dec", revenue: 420000 },
  { month: "Jan", revenue: 475000 },
  { month: "Feb", revenue: 520000 },
  { month: "Mar", revenue: 580000 },
  { month: "Apr", revenue: 640000 },
  { month: "May", revenue: 715000 }
];

// 14. Enquiries (Realistic Indian leads for Civil Lines branch)
export const MOCK_ENQUIRIES: Enquiry[] = [
  {
    id: "enq-1",
    name: "Gaurav Malhotra",
    phone: "+91 98231 22334",
    email: "gaurav.malhotra@gmail.com",
    description: "Interested in 3-month personal training package with focus on body recomposition. Prefers early morning 6:30 AM slot with Coach Vikram Rathore.",
    gymId: "gym-fitzone-1",
    date: format(subDays(new Date(), 3), "yyyy-MM-dd"),
    messageSent: true,
    sentMessageText: "Namaste Gaurav Malhotra, thank you for visiting FitZone Elite Civil Lines! Coach Vikram Rathore looks forward to your fitness consultation."
  },
  {
    id: "enq-2",
    name: "Tanvi Deshmukh",
    phone: "+91 98901 44556",
    email: "tanvi.deshmukh@gmail.com",
    description: "Enquired regarding women's strength training batches, HIIT cardio, and certified nutritionist guidance with Coach Anjali Menon.",
    gymId: "gym-fitzone-1",
    date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    messageSent: true,
    sentMessageText: "Namaste Tanvi Deshmukh, thank you for enquiring with FitZone Elite! Our coach Anjali Menon will reach out with the batch details shortly."
  },
  {
    id: "enq-3",
    name: "Sameer Kulkarni",
    phone: "+91 94228 77665",
    email: "sameer.kulkarni@gmail.com",
    description: "Engineering student at VNIT looking for student discount on annual gym membership. Prefers evening 7 PM workout slot.",
    gymId: "gym-fitzone-1",
    date: format(new Date(), "yyyy-MM-dd"),
    messageSent: false
  },
  {
    id: "enq-4",
    name: "Ritu Sen",
    phone: "+91 98112 33445",
    email: "ritu.sen@gmail.com",
    description: "Looking for couple membership plan with steam & sauna access. Needs trial session on Saturday morning.",
    gymId: "gym-fitzone-1",
    date: format(subDays(new Date(), 5), "yyyy-MM-dd"),
    messageSent: true,
    sentMessageText: "Hi Ritu Sen, your complimentary Saturday trial at FitZone Elite is confirmed! Please bring clean training shoes and a sweat towel."
  }
];

// 15. Expense Categories
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

// 16. Expenses (Realistic monthly operational expenses for Nagpur Civil Lines branch in INR)
export const MOCK_EXPENSES: Expense[] = [
  {
    id: "exp-001",
    gymId: "gym-fitzone-1",
    category: "Rent",
    amount: 85000,
    date: format(subDays(new Date(), 4), "yyyy-MM-dd"),
    description: "Civil Lines Commercial Facility Monthly Floor Lease"
  },
  {
    id: "exp-002",
    gymId: "gym-fitzone-1",
    category: "Electricity/Utility",
    amount: 28450,
    date: format(subDays(new Date(), 8), "yyyy-MM-dd"),
    description: "MSEDCL Commercial Power & Heavy HVAC Tariff"
  },
  {
    id: "exp-003",
    gymId: "gym-fitzone-1",
    category: "Staff Salary",
    amount: 115000,
    date: format(subDays(new Date(), 12), "yyyy-MM-dd"),
    description: "Monthly Trainer & Operations Staff Payroll"
  },
  {
    id: "exp-004",
    gymId: "gym-fitzone-1",
    category: "Maintenance & Repairs",
    amount: 14500,
    date: format(subDays(new Date(), 15), "yyyy-MM-dd"),
    description: "Jerai Fitness Cable Replacements & Pulley Lubrication"
  },
  {
    id: "exp-005",
    gymId: "gym-fitzone-1",
    category: "Supplement/Beverage Stock",
    amount: 24500,
    date: format(subDays(new Date(), 18), "yyyy-MM-dd"),
    description: "MuscleBlaze & Optimum Nutrition Whey/Creatine Front Desk Restock"
  },
  {
    id: "exp-006",
    gymId: "gym-fitzone-1",
    category: "Marketing & Promotions",
    amount: 12000,
    date: format(subDays(new Date(), 22), "yyyy-MM-dd"),
    description: "Local Instagram & Meta Lead Generation Ads in Nagpur"
  },
  {
    id: "exp-007",
    gymId: "gym-fitzone-1",
    category: "Other Expenses",
    amount: 3800,
    date: format(subDays(new Date(), 25), "yyyy-MM-dd"),
    description: "Bisleri 20L Water Dispenser Cans & Floor Sanitizer"
  }
];

// 17. Feedbacks (Authentic Gym Owner reviews for Super Admin dashboard)
export const MOCK_FEEDBACKS: Feedback[] = [
  {
    id: "feed-1",
    gymId: "gym-fitzone-1",
    gymName: "FitZone Elite",
    ownerName: "Rajesh Singhania",
    date: format(subDays(new Date(), 2), "yyyy-MM-dd"),
    rating: 5,
    comment: "The new QR check-in and automated WhatsApp billing alerts have reduced front desk congestion completely! Outstanding platform."
  },
  {
    id: "feed-2",
    gymId: "gym-irontemple",
    gymName: "Iron Temple Gym",
    ownerName: "Pooja Deshmukh",
    date: format(subDays(new Date(), 5), "yyyy-MM-dd"),
    rating: 5,
    comment: "Managing our Pune trainers, client workout split assignments, and monthly GST invoicing has never been this seamless."
  },
  {
    id: "feed-3",
    gymId: "gym-cardiohub",
    gymName: "Cardio Hub",
    ownerName: "Tarun Verma",
    date: format(subDays(new Date(), 8), "yyyy-MM-dd"),
    rating: 4,
    comment: "The 7-day trial convinced us. The biometric sync and member attendance streak analytics are super helpful for client retention."
  },
  {
    id: "feed-4",
    gymId: "gym-fitzone-2",
    gymName: "FitZone Studio",
    ownerName: "Rajesh Singhania",
    date: format(subDays(new Date(), 14), "yyyy-MM-dd"),
    rating: 5,
    comment: "Multi-branch switching between Civil Lines and Dharampeth is lightning fast. Love the dark mode UI too!"
  }
];

// 18. Plan Upgrade Requests (Submitted by Gym Owners for Super Admin approval)
export const MOCK_PLAN_UPGRADE_REQUESTS: PlanUpgradeRequest[] = [
  {
    id: "upgrade-req-1",
    ownerId: "owner-active-1",
    ownerName: "Rajesh Singhania",
    gymName: "FitZone Elite",
    currentPlanId: "sub-standard",
    requestedPlanId: "sub-pro",
    requestedPlanName: "Enterprise Pro (Annual)",
    status: "pending",
    requestDate: subDays(new Date(), 1).toISOString()
  },
  {
    id: "upgrade-req-2",
    ownerId: "owner-trial",
    ownerName: "Tarun Verma",
    gymName: "Cardio Hub",
    currentPlanId: undefined,
    requestedPlanId: "sub-standard",
    requestedPlanName: "Growth Standard (Quarterly)",
    status: "pending",
    requestDate: subDays(new Date(), 2).toISOString()
  }
];
