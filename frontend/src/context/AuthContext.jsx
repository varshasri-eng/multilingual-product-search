import { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    getMe()
      .then((res) => setCustomer(res.data.customer))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const signIn = (token, customerData) => {
    localStorage.setItem("token", token);
    setCustomer(customerData);
  };

  const signOut = () => {
    localStorage.removeItem("token");
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ customer, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
