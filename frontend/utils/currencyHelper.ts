export const getCurrencySymbol = (currency?: string): string => {
  switch (currency?.toUpperCase()) {
    case 'INR':
    case 'RUPEE':
    case 'RUPEES':
      return '₹';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'USD':
    default:
      return '$';
  }
};

export const formatCurrency = (amount: number, currency?: string): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
};
