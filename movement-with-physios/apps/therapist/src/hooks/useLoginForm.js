import { useState } from 'react';
import { validateEmail, validatePassword } from '../utils/validators';

// Custom hook managing login form state, validation, and mock submit
const useLoginForm = (navigation) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: null, password: null });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });
    return !emailError && !passwordError;
  };

  // ─────────────────────────────────────────────────────────
  // MOCK LOGIN — Backend developer: replace this block only.
  // Keep everything else in this file as-is.
  // ─────────────────────────────────────────────────────────
  const handleLogin = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      console.log('[MOCK] Login attempted with:', email);
      // TODO: Replace with → const res = await AuthService.login(email, password);
      // TODO: On success → navigation.navigate('Dashboard');
    }, 1500);
  };

  const clearError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  return {
    email,
    setEmail: (val) => { setEmail(val); clearError('email'); },
    password,
    setPassword: (val) => { setPassword(val); clearError('password'); },
    errors,
    showPassword,
    toggleShowPassword: () => setShowPassword((prev) => !prev),
    loading,
    handleLogin,
  };
};

export default useLoginForm;
