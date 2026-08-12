import { createContext, useContext, useState, useEffect } from "react";
import { registerCustomer, loginCustomer, getCurrentCustomer } from "../api";
const AuthContext = createContext(null);
const TOKEN_KEY = "s2h_auth_token";
export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  // On first load, if a token is already stored, verify it's still
  // valid and load the customer — keeps login persisted across page
  // refreshes, not just within one session.
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return;
    }
    getCurrentCustomer(storedToken)
      .then((data) => {
        setCustomer(data);
        setToken(storedToken);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY)) // expired/invalid token
      .finally(() => setLoading(false));
  }, []);
  const register = async (name, email, password, phone) => {
    const data = await registerCustomer(name, email, password, phone);
    localStorage.setItem(TOKEN_KEY, data.token);
    setCustomer(data.customer);
    setToken(data.token);
  };
  const login = async (email, password) => {
    const data = await loginCustomer(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setCustomer(data.customer);
    setToken(data.token);
  };
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setCustomer(null);
    setToken(null);
  };
  return (
    <AuthContext.Provider value={{ customer, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}