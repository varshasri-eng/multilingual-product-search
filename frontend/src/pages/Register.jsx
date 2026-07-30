import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, verifyOtp } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { FiHome, FiArrowRight, FiPhone, FiMail, FiMessageCircle } from "react-icons/fi";

export default function Register() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const [step, setStep]       = useState("form"); // form | otp
  const [loading, setLoading] = useState(false);
  const [otp, setOtp]         = useState("");

  const [form, setForm] = useState({
    phone: "",
    whatsapp_number: "",
    email: "",
  });

  // whether "same as phone" checkbox is ticked
  const [sameAsPhone, setSameAsPhone] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSameAsPhone = (e) => {
    const checked = e.target.checked;
    setSameAsPhone(checked);
    if (checked) {
      setForm((prev) => ({ ...prev, whatsapp_number: prev.phone }));
    }
  };

  // keep whatsapp in sync while typing phone, if checkbox is on
  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      phone: val,
      whatsapp_number: sameAsPhone ? val : prev.whatsapp_number,
    }));
  };

  // ── Submit registration ──────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.phone.trim())  return toast.error("Phone number is required.");
    if (!form.email.trim())  return toast.error("Email is required.");
    setLoading(true);
    try {
      // pass phone as name too — admin can update later; backend requires name
      await register({
        name: form.phone,           // minimal — phone as placeholder name
        phone: form.phone.trim(),
        email: form.email.trim(),
        whatsapp_number: form.whatsapp_number.trim() || form.phone.trim(),
      });
      toast.success("Account created! Check your email for the OTP.");
      setStep("otp");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ───────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error("Enter the OTP.");
    setLoading(true);
    try {
      const res = await verifyOtp(form.email.trim(), otp.trim());
      signIn(res.data.token, res.data.customer);
      toast.success("Welcome to Store2Home!");
      navigate("/account/profile");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14
                          bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-200">
            <FiHome className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Store2Home — Lathrop &amp; Mountain House</p>
        </div>

        {step === "form" ? (
          <form onSubmit={handleRegister} className="card space-y-5">

            {/* Phone */}
            <div>
              <label className="label">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-2.5 text-gray-400" size={15} />
                <input
                  className="input pl-9"
                  placeholder="5101234567"
                  type="tel"
                  value={form.phone}
                  onChange={handlePhoneChange}
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="label">WhatsApp Number</label>
              <div className="relative">
                <FiMessageCircle className="absolute left-3 top-2.5 text-gray-400" size={15} />
                <input
                  className="input pl-9 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="5101234567"
                  type="tel"
                  value={form.whatsapp_number}
                  onChange={set("whatsapp_number")}
                  disabled={sameAsPhone}
                  autoComplete="tel"
                />
              </div>
              {/* Same as phone checkbox */}
              <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={sameAsPhone}
                  onChange={handleSameAsPhone}
                  className="w-4 h-4 rounded border-gray-300 text-brand-500
                             focus:ring-brand-400 accent-brand-500"
                />
                <span className="text-sm text-gray-500">Same as phone number</span>
              </label>
            </div>

            {/* Email */}
            <div>
              <label className="label">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-2.5 text-gray-400" size={15} />
                <input
                  className="input pl-9"
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  autoComplete="email"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                We'll send a one-time password to this email.
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              disabled={loading}>
              {loading
                ? <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating account…
                  </span>
                : <><span>Create Account</span><FiArrowRight size={15} /></>}
            </button>
          </form>

        ) : (
          /* OTP step */
          <div className="card space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Verify your email</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold text-gray-700">{form.email}</span>
              </p>
            </div>

            <div className="bg-brand-50 rounded-xl px-4 py-3 text-sm text-brand-700">
              Check your inbox (and spam folder). The code expires in 10 minutes.
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="label">One-Time Password</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input text-center text-2xl tracking-[0.5em] font-mono py-3"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full py-2.5"
                disabled={loading}>
                {loading ? "Verifying…" : "Verify & Continue"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to registration
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
