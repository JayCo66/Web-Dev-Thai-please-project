import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [tokens, setTokens] = useState(0); // Impact tokens
  const [wallet, setWallet] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load
  useEffect(() => {
    async function loadCurrentUser() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/users/me');
        if (response.data && response.data.success) {
          const { user, tokens, wallet, shop } = response.data.data;
          setUser(user);
          setTokens(tokens || 0);

          // Restore or initialize simulated wallet balance
          const savedBalance = localStorage.getItem('user_simulated_balance');
          const effectiveBalance = savedBalance !== null ? savedBalance : (wallet?.balance || '500.00');
          setWallet({
            ...(wallet || {}),
            balance: effectiveBalance,
          });

          setShop(shop || null);
        }
      } catch (error) {
        console.warn('Session expired or invalid, logging out:', error);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadCurrentUser();
  }, []);

  // Standard Login (Citizen / Merchant / Admin)
  const login = async (identifier, password) => {
    try {
      const response = await api.post('/auth/login', { identifier, password });
      if (response.data && response.data.success) {
        const { token, user, tokens, wallet, shop } = response.data.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        setTokens(tokens || 0);

        const savedBalance = localStorage.getItem('user_simulated_balance');
        const effectiveBalance = savedBalance !== null ? savedBalance : (wallet?.balance || '500.00');
        setWallet({
          ...(wallet || {}),
          balance: effectiveBalance,
        });

        setShop(shop || null);
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.error || 'เข้าสู่ระบบไม่สำเร็จ' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      return { success: false, error: msg };
    }
  };

  // ThaiD Login (Mock)
  const loginThaiD = async (citizenId, fullName) => {
    try {
      const response = await api.post('/auth/login-thaid', { citizenId, fullName });
      if (response.data && response.data.success) {
        const { token, user, tokens, wallet, isNew } = response.data.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        setTokens(tokens || 0);

        const savedBalance = localStorage.getItem('user_simulated_balance');
        const effectiveBalance = savedBalance !== null ? savedBalance : (wallet?.balance || '500.00');
        setWallet({
          ...(wallet || {}),
          balance: effectiveBalance,
        });

        return { success: true, isNew, data: response.data.data };
      }
      return { success: false, error: response.data.error || 'เข้าสู่ระบบด้วย ThaiD ไม่สำเร็จ' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ ThaiD';
      return { success: false, error: msg };
    }
  };

  // Citizen Registration
  const registerCitizen = async (formData) => {
    try {
      const response = await api.post('/users/register-thai-please', formData);
      if (response.data && response.data.success) {
        const { token, user, tokens, wallet } = response.data.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        setTokens(tokens || 50);
        setWallet(wallet || null);
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.error || 'ลงทะเบียนไม่สำเร็จ' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'เกิดข้อผิดพลาดในการลงทะเบียน';
      return { success: false, error: msg };
    }
  };

  // Merchant Registration
  const registerMerchant = async (formData) => {
    try {
      const response = await api.post('/merchants/register', formData);
      if (response.data && response.data.success) {
        const { token, user, shop } = response.data.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        setShop(shop || null);
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.error || 'ลงทะเบียนร้านค้าไม่สำเร็จ' };
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'เกิดข้อผิดพลาดในการลงทะเบียนร้านค้า';
      return { success: false, error: msg };
    }
  };

  // Deduct simulated balance
  const deductBalance = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    const currentBalance = parseFloat(wallet?.balance || '500.00');
    const newBalance = Math.max(0, currentBalance - numAmount).toFixed(2);

    localStorage.setItem('user_simulated_balance', newBalance);
    setWallet((prev) => ({
      ...(prev || {}),
      balance: newBalance,
    }));
    return newBalance;
  };

  // Add impact tokens
  const addTokens = (amount) => {
    setTokens((prev) => prev + amount);
  };

  // Deduct impact tokens
  const deductTokens = (amount) => {
    setTokens((prev) => Math.max(0, prev - amount));
  };

  // Set tokens balance directly
  const setTokensBalance = (amount) => {
    setTokens(amount);
  };

  // Refresh user and token data from backend
  const refreshUser = async () => {
    try {
      const response = await api.get('/users/me');
      if (response.data && response.data.success) {
        const { user, tokens } = response.data.data;
        setUser(user);
        setTokens(tokens || 0);
        return { success: true, tokens, user };
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  // Reset demo balance
  const resetBalance = (amount = 500) => {
    const val = parseFloat(amount).toFixed(2);
    localStorage.setItem('user_simulated_balance', val);
    setWallet((prev) => ({
      ...(prev || {}),
      balance: val,
    }));
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_simulated_balance');
    setToken(null);
    setUser(null);
    setTokens(0);
    setWallet(null);
    setShop(null);
  };

  const value = {
    user,
    token,
    tokens,
    wallet,
    shop,
    loading,
    isAuthenticated: !!user,
    login,
    loginThaiD,
    registerCitizen,
    registerMerchant,
    deductBalance,
    addTokens,
    deductTokens,
    setTokensBalance,
    refreshUser,
    resetBalance,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
