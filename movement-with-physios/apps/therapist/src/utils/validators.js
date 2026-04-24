// Frontend validation rules — no backend involved

export const validateEmail = (email) => {
  if (!email || email.trim() === '') return 'Email is required';
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return 'Enter a valid email address';
  return null; // null means valid
};

export const validatePassword = (password) => {
  if (!password || password.trim() === '') return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
};
