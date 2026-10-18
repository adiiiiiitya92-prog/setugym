export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

export const validatePassword = (password: string): boolean => {
  // At least 6 characters
  return password.length >= 6;
};

export const validateRequired = (text: string): boolean => {
  return text.trim().length > 0;
};
