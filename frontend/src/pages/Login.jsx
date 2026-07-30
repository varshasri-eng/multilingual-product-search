import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, verifyOtp } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { FiHome, FiMail, FiArrowRight } from "react-icons/fi";

export default function Login() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const [step, setStep]             = useState("email");  // email | otp
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp]               = useState("");
  const [loading, setLoading]       = useState(false);

  // ── Step 1: request OTP ──────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return toast.error("Enter your email or phone.");
    setLoading(true);
    try {
      await login(identifier.trim());
      toast.success("OTP sent! Check your email.");
      setStep("otp");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ───────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error("Enter the OTP.");
    setLoading(true);
    try {
      const res = await verifyOtp(identifier.trim(), otp.trim());
      signIn(res.data.token, res.data.customer);
      toast.success(`Welcome back, ${res.data.customer.name}!`);
      navigate(res.data.customer.role === "admin" ? "/admin/customers" : "/account/profile");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14
                          bg-brand-500 rounded-2xl mb-4 shadow-lg">
            <FiHome className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Store2Home</h1>
          <p className="text-gray-500 text-sm mt-1">
            Local delivery for Lathrop &amp; Mountain House
          </p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            {step === "email" ? "Sign in to your account" : "Enter your OTP"}
          </h2>

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="label">Email or Phone</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    className="input pl-9"
                    placeholder="your@email.com or phone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading ? "Sending…" : <><span>Send OTP</span><FiArrowRight /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-gray-600 bg-brand-50 rounded-lg px-4 py-3">
                OTP sent to <span className="font-semibold">{identifier}</span>
                <br />
                <span className="text-xs text-gray-400">(Check the backend console in dev mode)</span>
              </p>
              <div>
                <label className="label">One-Time Password</label>
                <input
                  type="text"
                  className="input text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "Verifying…" : "Verify & Sign In"}
              </button>
              <button type="button" className="text-sm text-brand-600 hover:underline w-full text-center"
                onClick={() => { setStep("email"); setOtp(""); }}>
                ← Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-600 font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
