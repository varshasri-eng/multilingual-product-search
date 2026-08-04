import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../api/auth";
import toast from "react-hot-toast";
import { FiUsers, FiLogOut, FiHome, FiShield, FiSearch } from "react-icons/fi";

export default function AdminLayout() {
  const { customer, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logout(); } catch (_) {}
    signOut();
    navigate("/admin/login");
    toast.success("Logged out.");
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
     ${isActive
       ? "bg-brand-100 text-brand-700"
       : "text-gray-600 hover:bg-gray-100"}`;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col p-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-2 px-2">
          <FiHome className="text-brand-500 text-xl" />
          <span className="font-bold text-lg text-gray-800">Store2Home</span>
        </div>
        <span className="text-xs text-purple-600 font-semibold px-2 mb-6">Admin Panel</span>

        {/* Admin info */}
        <div className="mb-6 px-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Admin</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{customer?.name}</p>
          <p className="text-xs text-gray-500 truncate">{customer?.email}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          <NavLink to="/admin/customers" className={navClass}>
            <FiUsers /> Customers
          </NavLink>
          <NavLink to="/admin/staff" className={navClass}>
            <FiShield /> Staff
          </NavLink>
          <NavLink to="/admin/search" className={navClass}>
            <FiSearch /> Search Insights
          </NavLink>
        </nav>

        {/* Logout */}
        <button onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-500
                     hover:bg-red-50 rounded-lg transition-colors mt-4">
          <FiLogOut /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
