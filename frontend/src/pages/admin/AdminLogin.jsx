import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, verifyOtp } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { FiShield, FiMail, FiArrowRight, FiLock } from "react-icons/fi";

export default function AdminLogin() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const [step, setStep]             = useState("email"); // email | otp
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp]               = useState("");
  const [loading, setLoading]       = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // ── Step 1: request OTP ──────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return toast.error("Enter your email.");
    setLoading(true);
    try {
      await login(identifier.trim());
      setStep("otp");
      toast.success("OTP sent.");
    } catch (err) {
      toast.error(err.response?.data?.error || "No account found.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP + role check ─────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error("Enter the OTP.");
    setLoading(true);
    setAccessDenied(false);
    try {
      const res = await verifyOtp(identifier.trim(), otp.trim());
      const customer = res.data.customer;

      // strict role check — only admins get through
      if (customer.role !== "admin") {
        setAccessDenied(true);
        setStep("email");
        setOtp("");
        setLoading(false);
        return;
      }

      signIn(res.data.token, customer);
      toast.success(`Welcome, ${customer.name}.`);
      navigate("/admin/customers");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-900">

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gray-800
                      border-r border-gray-700 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <FiShield className="text-white text-lg" />
          </div>
          <span className="text-white font-bold text-xl">Store2Home</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Staff Portal
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Manage customers, products, inventory and orders
            for Lathrop and Mountain House delivery operations.
          </p>
        </div>

        <div className="space-y-3">
          {[
            "Customer management",
            "Order tracking",
            "Inventory control",
            "Delivery zone management",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              <span className="text-gray-400 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <FiShield className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">Store2Home Staff</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            {step === "email" ? "Sign in" : "Verify identity"}
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            {step === "email"
              ? "Staff access only. Enter your registered email."
              : `OTP sent to ${identifier}`}
          </p>

          {/* Access denied banner */}
          {accessDenied && (
            <div className="flex items-start gap-3 bg-red-900/40 border border-red-700
                            rounded-xl px-4 py-3 mb-6">
              <FiLock className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-300 text-sm font-semibold">Access denied</p>
                <p className="text-red-400 text-xs mt-0.5">
                  This portal is restricted to staff accounts only.
                  Contact your administrator.
                </p>
              </div>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="email"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg
                               pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500
                               focus:outline-none focus:ring-2 focus:ring-brand-500
                               focus:border-transparent"
                    placeholder="staff@store2home.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold
                           py-2.5 rounded-lg transition-colors flex items-center
                           justify-center gap-2 disabled:opacity-50"
                disabled={loading}>
                {loading
                  ? "Sending…"
                  : <><span>Continue</span><FiArrowRight size={14} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-300">
                Check your email for a 6-digit OTP.
                <br />
                <span className="text-xs text-gray-500">
                  (Dev mode: check backend console or DB)
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  One-Time Password
                </label>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg
                             px-4 py-3 text-white text-2xl font-mono tracking-widest
                             text-center placeholder-gray-600
                             focus:outline-none focus:ring-2 focus:ring-brand-500
                             focus:border-transparent"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>

              <button type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold
                           py-2.5 rounded-lg transition-colors disabled:opacity-50"
                disabled={loading}>
                {loading ? "Verifying…" : "Verify & Enter Portal"}
              </button>

              <button type="button"
                onClick={() => { setStep("email"); setOtp(""); }}
                className="w-full text-sm text-gray-500 hover:text-gray-300
                           transition-colors text-center">
                ← Use a different email
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-600 mt-8">
            Customer portal?{" "}
            <a href="/login" className="text-brand-500 hover:text-brand-400">
              Sign in here
            </a>
            {" · "}
            <a href="/admin/register" className="text-brand-500 hover:text-brand-400">
              Request access
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
