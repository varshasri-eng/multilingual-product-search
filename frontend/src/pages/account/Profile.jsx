import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import {
  FiUser, FiPhone, FiMail, FiMessageCircle,
  FiEdit2, FiSave, FiX, FiShield, FiCheckCircle
} from "react-icons/fi";

const LANGUAGES   = ["english", "telugu", "hindi", "tamil"];
const DIET_OPTS   = ["veg", "nonveg", "both"];
const ORDER_TYPES = ["delivery", "pickup"];

export default function Profile() {
  const { customer: authCustomer, signIn } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({});

  useEffect(() => {
    getProfile()
      .then((res) => {
        setCustomer(res.data.customer);
        setForm(res.data.customer);
      })
      .catch(() => toast.error("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateProfile({
        name: form.name,
        phone: form.phone,
        whatsapp_number: form.whatsapp_number,
        email: form.email,
        preferred_language: form.preferred_language,
        dietary_preference: form.dietary_preference,
        default_order_type: form.default_order_type,
      });
      setCustomer(res.data.customer);
      setEditing(false);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(customer);
    setEditing(false);
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading profile…</div>;
  if (!customer) return null;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your personal details</p>
        </div>
        {!editing ? (
          <button className="btn-secondary flex items-center gap-2"
            onClick={() => setEditing(true)}>
            <FiEdit2 size={14} /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2"
              onClick={handleCancel} disabled={saving}>
              <FiX size={14} /> Cancel
            </button>
            <button className="btn-primary flex items-center gap-2"
              onClick={handleSave} disabled={saving}>
              <FiSave size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Status badges */}
      <div className="flex gap-2 mb-6">
        {customer.is_verified
          ? <span className="badge-verified flex items-center gap-1"><FiCheckCircle size={11} /> Verified</span>
          : <span className="badge-inactive">Not Verified</span>}
        {customer.role === "admin" &&
          <span className="badge-admin flex items-center gap-1"><FiShield size={11} /> Admin</span>}
        {customer.is_active
          ? <span className="badge-active">Active</span>
          : <span className="badge-inactive">Inactive</span>}
      </div>

      {/* Personal Info */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Personal Information
        </h2>
        <div className="space-y-4">
          <Field icon={<FiUser />} label="Full Name">
            {editing
              ? <input className="input" value={form.name} onChange={set("name")} />
              : <span>{customer.name}</span>}
          </Field>
          <Field icon={<FiPhone />} label="Phone">
            {editing
              ? <input className="input" value={form.phone} onChange={set("phone")} type="tel" />
              : <span>{customer.phone}</span>}
          </Field>
          <Field icon={<FiMessageCircle />} label="WhatsApp">
            {editing
              ? <input className="input" value={form.whatsapp_number || ""} onChange={set("whatsapp_number")} type="tel" />
              : <span>{customer.whatsapp_number || <em className="text-gray-400">Not set</em>}</span>}
          </Field>
          <Field icon={<FiMail />} label="Email">
            {editing
              ? <input className="input" value={form.email || ""} onChange={set("email")} type="email" />
              : <span>{customer.email || <em className="text-gray-400">Not set</em>}</span>}
          </Field>
        </div>
      </div>

      {/* Preferences */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Preferences
        </h2>
        <div className="space-y-4">
          <Field label="Preferred Language">
            {editing
              ? (
                <select className="input" value={form.preferred_language} onChange={set("preferred_language")}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
                </select>
              )
              : <span className="capitalize">{customer.preferred_language}</span>}
          </Field>
          <Field label="Dietary Preference">
            {editing
              ? (
                <select className="input" value={form.dietary_preference} onChange={set("dietary_preference")}>
                  {DIET_OPTS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                </select>
              )
              : <span className="capitalize">{customer.dietary_preference}</span>}
          </Field>
          <Field label="Default Order Type">
            {editing
              ? (
                <div className="flex gap-3">
                  {ORDER_TYPES.map((t) => (
                    <button type="button" key={t}
                      onClick={() => setForm((p) => ({ ...p, default_order_type: t }))}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors
                        ${form.default_order_type === t
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              )
              : <span className="capitalize">{customer.default_order_type}</span>}
          </Field>
        </div>
      </div>

      {/* Joined date */}
      <p className="text-xs text-gray-400 mt-4 text-right">
        Member since {new Date(customer.created_at).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric"
        })}
      </p>
    </div>
  );
}

function Field({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <span className="mt-2.5 text-gray-400 flex-shrink-0">{icon}</span>
      )}
      <div className="flex-1">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <div className="text-sm text-gray-800">{children}</div>
      </div>
    </div>
  );
}
