import { format, parseISO, differenceInDays } from 'date-fns';

export const formatDate = (date: string | Date, pattern: string = "MMM dd, yyyy"): string => {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  try {
    return format(d, pattern);
  } catch (err) {
    return "";
  }
};

export const getDaysRemaining = (futureDateStr: string): number => {
  if (!futureDateStr) return 0;
  const today = new Date();
  const futureDate = parseISO(futureDateStr);
  const diff = differenceInDays(futureDate, today);
  return diff > 0 ? diff : 0;
};

export const formatTime = (timeStr: string): string => {
  // Checks if timeStr is standard HH:MM
  if (!timeStr) return "";
  return timeStr; // For now simply return standard
};
