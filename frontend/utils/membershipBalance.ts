import { Invoice, Member, MemberPlan, GymOwner, SubscriptionPlan } from '../types';

export const getCurrentMembershipInvoices = (member: Member, invoices: Invoice[]) => {
  const cycleStart = member.startDate.slice(0, 10);

  return invoices.filter(invoice => {
    if (invoice.memberId !== member.id) return false;
    return invoice.date.slice(0, 10) >= cycleStart;
  });
};

export const getCurrentOwnerInvoices = (owner: GymOwner, invoices: Invoice[]) => {
  const cycleStart = owner.startDate ? owner.startDate.slice(0, 10) : (owner.trialStartDate ? owner.trialStartDate.slice(0, 10) : "");

  return invoices.filter(invoice => {
    if (invoice.memberId !== owner.id) return false;
    if (!cycleStart) return true;
    return invoice.date.slice(0, 10) >= cycleStart;
  });
};

export const getPaidInvoiceAmount = (invoice: Invoice) => {
  if (invoice.hasInstallments) {
    let paid = 0;
    if (invoice.firstInstallmentStatus === 'paid') {
      paid += invoice.firstInstallmentAmount || 0;
    }
    if (invoice.secondInstallmentStatus === 'paid') {
      paid += invoice.secondInstallmentAmount || 0;
    }
    return paid;
  }

  return invoice.status === 'paid' ? invoice.total : 0;
};

export const calculateMembershipBalance = (
  member: Member,
  invoices: Invoice[],
  memberPlans: MemberPlan[]
) => {
  const plan = memberPlans.find(p => p.id === member.planId);
  const membershipAmount = plan?.price || 0;
  const cycleInvoices = getCurrentMembershipInvoices(member, invoices);
  const totalPaid = cycleInvoices.reduce((sum, invoice) => sum + getPaidInvoiceAmount(invoice), 0);
  const remainingBalance = Math.max(0, membershipAmount - totalPaid);

  return {
    membershipAmount,
    totalPaid,
    remainingBalance,
    maximumAllowedInvoiceAmount: remainingBalance,
    isFullyPaid: membershipAmount > 0 && remainingBalance <= 0,
    currency: plan?.currency || 'INR',
    plan
  };
};

export const calculateOwnerSubscriptionBalance = (
  owner: GymOwner,
  invoices: Invoice[],
  subscriptionPlans: SubscriptionPlan[]
) => {
  const plan = subscriptionPlans.find(p => p.id === owner.planId);
  const subscriptionAmount = plan?.price || 0;
  const cycleInvoices = getCurrentOwnerInvoices(owner, invoices);
  const totalPaid = cycleInvoices.reduce((sum, invoice) => sum + getPaidInvoiceAmount(invoice), 0);
  const remainingBalance = Math.max(0, subscriptionAmount - totalPaid);

  return {
    subscriptionAmount,
    totalPaid,
    remainingBalance,
    maximumAllowedInvoiceAmount: remainingBalance,
    isFullyPaid: subscriptionAmount > 0 && remainingBalance <= 0,
    currency: 'INR',
    plan
  };
};
