import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Auth pages
import Login         from "./pages/Login";
import Register      from "./pages/Register";
import AdminLogin    from "./pages/admin/AdminLogin";
import AdminRegister from "./pages/admin/AdminRegister";

// Customer account pages
import Profile       from "./pages/account/Profile";
import Addresses     from "./pages/account/Addresses";
import Orders        from "./pages/account/Orders";
import FamilyGroup   from "./pages/account/FamilyGroup";
import Notifications from "./pages/account/Notifications";
import Settings      from "./pages/account/Settings";

// Admin pages
import CustomerList    from "./pages/admin/CustomerList";
import CustomerDetail  from "./pages/admin/CustomerDetail";
import StaffManagement from "./pages/admin/StaffManagement";

// Layouts
import CustomerLayout from "./components/CustomerLayout";
import AdminLayout    from "./components/AdminLayout";

const Loader = () => (
  <div className="flex items-center justify-center h-screen text-gray-400">
    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
    Loading…
  </div>
);

// ── Customer route guard ─────────────────────────────────────
function ProtectedRoute({ children }) {
  const { customer, loading } = useAuth();
  if (loading) return <Loader />;
  return customer ? children : <Navigate to="/login" replace />;
}

// ── Admin route guard ────────────────────────────────────────
function AdminRoute({ children }) {
  const { customer, loading } = useAuth();
  if (loading) return <Loader />;
  if (!customer)                 return <Navigate to="/admin/login" replace />;
  if (customer.role !== "admin") return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>

        {/* ── Customer public ─────────────────────────── */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ── Customer protected ──────────────────────── */}
        <Route path="/account" element={
          <ProtectedRoute><CustomerLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile"       element={<Profile />} />
          <Route path="addresses"     element={<Addresses />} />
          <Route path="orders"        element={<Orders />} />
          <Route path="family"        element={<FamilyGroup />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings"      element={<Settings />} />
        </Route>

        {/* ── Admin login — completely separate ───────── */}
        <Route path="/admin/login"    element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* ── Admin protected ─────────────────────────── */}
        <Route path="/admin" element={
          <AdminRoute><AdminLayout /></AdminRoute>
        }>
          <Route index element={<Navigate to="customers" replace />} />
          <Route path="customers"     element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="staff"         element={<StaffManagement />} />
        </Route>

        {/* ── Defaults ────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />

      </Routes>
    </AuthProvider>
  );
}
