import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { logout } from "../../api/auth";
import { updateProfile } from "../../api/customers";
import toast from "react-hot-toast";
import {
  FiGlobe, FiMoon, FiSun, FiLogOut, FiTrash2,
  FiShield, FiAlertTriangle, FiChevronRight,
} from "react-icons/fi";

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "telugu",  label: "తెలుగు (Telugu)" },
  { value: "hindi",   label: "हिन्दी (Hindi)" },
  { value: "tamil",   label: "தமிழ் (Tamil)" },
];

export default function Settings() {
  const { customer, signOut } = useAuth();
  const navigate = useNavigate();

  const [language, setLanguage] = useState(customer?.preferred_language || "english");
  const [theme, setTheme]       = useState("light"); // light | dark
  const [showDelete, setShowDelete] = useState(false);
  const [savingLang, setSavingLang] = useState(false);

  const handleLanguageChange = async (value) => {
    setLanguage(value);
    setSavingLang(true);
    try {
      await updateProfile({ preferred_language: value });
      toast.success("Language preference saved.");
    } catch {
      toast.error("Could not save language preference.");
      setLanguage(customer?.preferred_language || "english");
    } finally {
      setSavingLang(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } catch (_) {}
    signOut();
    navigate("/login");
    toast.success("Logged out.");
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">App preferences and account options</p>
      </div>

      <div className="space-y-4">

        {/* Language */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Preferences
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <FiGlobe className="text-blue-500" size={15} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Language</p>
                <p className="text-xs text-gray-400">App display language</p>
              </div>
            </div>
            <select
              className="input w-44 text-sm"
              value={language}
              disabled={savingLang}
              onChange={(e) => handleLanguageChange(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                {theme === "light"
                  ? <FiSun className="text-yellow-500" size={15} />
                  : <FiMoon className="text-indigo-500" size={15} />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Appearance</p>
                <p className="text-xs text-gray-400">Light or dark mode</p>
              </div>
            </div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
              {["light", "dark"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t);
                    toast("Dark mode coming soon!", { icon: "🌙" });
                  }}
                  className={`px-3 py-1.5 font-medium transition-colors capitalize
                    ${theme === t
                      ? "bg-gray-800 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Security
          </h3>
          <button
            className="w-full flex items-center justify-between py-2 hover:bg-gray-50
                       rounded-lg px-2 -mx-2 transition-colors"
            onClick={() => toast("Two-factor auth coming soon!", { icon: "🔒" })}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <FiShield className="text-purple-500" size={15} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">Two-factor authentication</p>
                <p className="text-xs text-gray-400">Add an extra layer of security</p>
              </div>
            </div>
            <FiChevronRight className="text-gray-400" size={15} />
          </button>
        </div>

        {/* Session */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Session
          </h3>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg
                       text-red-500 hover:bg-red-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <FiLogOut size={15} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-red-400">Signed in as {customer?.email || customer?.phone}</p>
            </div>
          </button>
        </div>

        {/* Danger zone */}
        <div className="card border-red-100">
          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-4">
            Danger Zone
          </h3>
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-3 text-sm text-red-500 hover:text-red-700
                         hover:bg-red-50 rounded-lg px-2 py-2 -mx-2 transition-colors w-full">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <FiTrash2 size={15} />
              </div>
              <div className="text-left">
                <p className="font-medium">Delete account</p>
                <p className="text-xs text-red-400">Permanently remove your account and data</p>
              </div>
            </button>
          ) : (
            <div className="bg-red-50 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-4">
                <FiAlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={16} />
                <div>
                  <p className="text-sm font-semibold text-red-700">Are you sure?</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    This action cannot be undone. All your data, addresses, and order history
                    will be permanently deleted.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="btn-secondary text-sm flex-1"
                  onClick={() => setShowDelete(false)}>
                  Cancel
                </button>
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold
                             px-4 py-2 rounded-lg transition-colors"
                  onClick={() => toast("Account deletion coming soon. Contact support.", { icon: "⚠️" })}>
                  Delete my account
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
