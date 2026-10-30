import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../services/api";
const AuthContext = createContext(null);
const profileUser = (data) =>
  data.user ??
  Object.fromEntries(
    Object.entries(data).filter(
      ([key]) => !["tokens", "wallet", "shop", "activeBoard"].includes(key),
    ),
  );
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [tokens, setTokens] = useState(0);
  const [wallet, setWallet] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const applyProfile = useCallback((data) => {
    setUser(profileUser(data));
    setTokens(data.tokens ?? data.user?.tokens ?? 0);
    setWallet(data.wallet || null);
    setShop(data.shop || null);
  }, []);
  const logout = useCallback(() => {
    [
      "token",
      "user_simulated_balance",
      "user_thaiplus_tickets",
      "user_thaiplus_vouchers",
    ].forEach((key) => localStorage.removeItem(key));
    setToken(null);
    setUser(null);
    setTokens(0);
    setWallet(null);
    setShop(null);
  }, []);
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/users/me");
      if (!data.success) throw new Error(data.error);
      applyProfile(data.data);
      return { success: true, ...data.data, user: profileUser(data.data) };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "โหลดบัญชีไม่สำเร็จ",
      };
    }
  }, [applyProfile]);
  useEffect(() => {
    let active = true;
    async function restore() {
      if (localStorage.getItem("token")) {
        try {
          const { data } = await api.get("/users/me");
          if (active && data.success) applyProfile(data.data);
        } catch (error) {
          if (active && [401, 404].includes(error.response?.status)) logout();
        }
      }
      if (active) setLoading(false);
    }
    restore();
    return () => {
      active = false;
    };
  }, [applyProfile, logout]);
  const authenticate = useCallback(
    async (path, payload) => {
      try {
        const { data } = await api.post(path, payload);
        if (!data.success) return { success: false, error: data.error };
        localStorage.setItem("token", data.data.token);
        setToken(data.data.token);
        applyProfile(data.data);
        await refreshUser();
        return { success: true, data: data.data, isNew: data.data.isNew };
      } catch (error) {
        return {
          success: false,
          error:
            error.response?.data?.error || "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่",
        };
      }
    },
    [applyProfile, refreshUser],
  );
  const demoLogin = useCallback(
    () => authenticate("/auth/demo-login", {}),
    [authenticate],
  );
  const login = useCallback(
    (identifier, password) =>
      authenticate("/auth/login", { identifier, password }),
    [authenticate],
  );
  const loginThaiD = useCallback(
    (citizenId, fullName) =>
      authenticate("/auth/login-thaid", { citizenId, fullName }),
    [authenticate],
  );
  const registerCitizen = useCallback(
    (data) => authenticate("/users/register-thai-please", data),
    [authenticate],
  );
  const registerMerchant = useCallback(
    (data) => authenticate("/merchants/register", data),
    [authenticate],
  );
  const resetBalance = useCallback(async () => {
    try {
      await api.post("/users/demo-topup", { requestId: crypto.randomUUID() });
      return await refreshUser();
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "เติมเงินทดลองไม่สำเร็จ",
      };
    }
  }, [refreshUser]);
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        tokens,
        wallet,
        shop,
        loading,
        isAuthenticated: !!user,
        login,
        demoLogin,
        loginThaiD,
        registerCitizen,
        registerMerchant,
        logout,
        refreshUser,
        resetBalance,
        setTokensBalance: setTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}
