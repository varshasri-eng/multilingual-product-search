import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FiSave, FiImage, FiType, FiDroplet, FiMail, FiPhone,
  FiMapPin, FiGlobe, FiMessageSquare, FiLayout,
} from "react-icons/fi";
import { getSettings, updateSettings } from "../../api/settings";

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#e89208"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="input flex-1"
          placeholder="#e89208"
        />
      </div>
    </div>
  );
}

export default function AdminBrandingPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("identity");

  useEffect(() => {
    getSettings()
      .then((r) => setSettings(r.data))
      .catch(() => toast.error("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateSettings(settings);
      setSettings(res.data.settings);
      toast.success("Branding updated!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (!settings) return <p className="text-red-500">Failed to load settings.</p>;

  const tabs = [
    { key: "identity", label: "Identity", icon: <FiType size={14} /> },
    { key: "colors", label: "Colors", icon: <FiDroplet size={14} /> },
    { key: "hero", label: "Landing Page", icon: <FiLayout size={14} /> },
    { key: "contact", label: "Contact", icon: <FiMail size={14} /> },
    { key: "social", label: "Social", icon: <FiGlobe size={14} /> },
  ];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branding & Site Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Customize how your site looks and feels.</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          <FiSave size={15} />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {tab === "identity" && (
          <div className="space-y-4">
            <div>
              <label className="label">Site name</label>
              <input className="input" value={settings.site_name || ""} onChange={(e) => update("site_name", e.target.value)} />
            </div>
            <div>
              <label className="label">Tagline</label>
              <input className="input" value={settings.tagline || ""} onChange={(e) => update("tagline", e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><FiImage size={13} /> Logo URL</label>
              <input className="input" value={settings.logo_url || ""} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://..." />
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo preview" className="h-12 mt-2 rounded-lg border border-gray-100" />
              )}
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><FiImage size={13} /> Favicon URL</label>
              <input className="input" value={settings.favicon_url || ""} onChange={(e) => update("favicon_url", e.target.value)} placeholder="https://..." />
            </div>
          </div>
        )}

        {tab === "colors" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-2">These colors apply across the entire site via CSS variables.</p>
            <ColorField label="Primary color" value={settings.primary_color} onChange={(v) => update("primary_color", v)} />
            <ColorField label="Secondary color" value={settings.secondary_color} onChange={(v) => update("secondary_color", v)} />
            <ColorField label="Accent color" value={settings.accent_color} onChange={(v) => update("accent_color", v)} />

            {/* Preview */}
            <div className="mt-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Preview</p>
              <div className="flex gap-2">
                <div className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: settings.primary_color }}>Primary</div>
                <div className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: settings.secondary_color }}>Secondary</div>
                <div className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: settings.accent_color }}>Accent</div>
              </div>
            </div>
          </div>
        )}

        {tab === "hero" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-2">Customize the landing page hero section.</p>
            <div>
              <label className="label">Hero title</label>
              <input className="input" value={settings.hero_title || ""} onChange={(e) => update("hero_title", e.target.value)} />
            </div>
            <div>
              <label className="label">Hero subtitle</label>
              <textarea className="input !h-20 resize-none" value={settings.hero_subtitle || ""} onChange={(e) => update("hero_subtitle", e.target.value)} />
            </div>
            <div>
              <label className="label">CTA button text</label>
              <input className="input" value={settings.hero_cta || ""} onChange={(e) => update("hero_cta", e.target.value)} />
            </div>
          </div>
        )}

        {tab === "contact" && (
          <div className="space-y-4">
            <div>
              <label className="label flex items-center gap-1.5"><FiMail size={13} /> Contact email</label>
              <input className="input" type="email" value={settings.contact_email || ""} onChange={(e) => update("contact_email", e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><FiPhone size={13} /> Contact phone</label>
              <input className="input" type="tel" value={settings.contact_phone || ""} onChange={(e) => update("contact_phone", e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><FiMapPin size={13} /> Address</label>
              <textarea className="input !h-20 resize-none" value={settings.address || ""} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><FiMessageSquare size={13} /> Footer text</label>
              <input className="input" value={settings.footer_text || ""} onChange={(e) => update("footer_text", e.target.value)} />
            </div>
          </div>
        )}

        {tab === "social" && (
          <div className="space-y-4">
            <div>
              <label className="label">Facebook URL</label>
              <input className="input" value={settings.facebook_url || ""} onChange={(e) => update("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
            </div>
            <div>
              <label className="label">Instagram URL</label>
              <input className="input" value={settings.instagram_url || ""} onChange={(e) => update("instagram_url", e.target.value)} placeholder="https://instagram.com/..." />
            </div>
            <div>
              <label className="label">Twitter / X URL</label>
              <input className="input" value={settings.twitter_url || ""} onChange={(e) => update("twitter_url", e.target.value)} placeholder="https://x.com/..." />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
