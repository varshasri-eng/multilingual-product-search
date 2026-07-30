import { useState } from "react";
import toast from "react-hot-toast";
import {
  FiBell, FiMessageCircle, FiMail, FiSmartphone,
  FiShoppingBag, FiTruck, FiTag, FiInfo,
} from "react-icons/fi";

const NOTIF_SECTIONS = [
  {
    title: "Order Updates",
    icon: <FiShoppingBag size={15} />,
    items: [
      { key: "order_confirmed",  label: "Order confirmed",          desc: "When your order is accepted" },
      { key: "order_dispatched", label: "Out for delivery",          desc: "When the driver is on the way" },
      { key: "order_delivered",  label: "Delivery complete",         desc: "When your order is delivered" },
      { key: "order_cancelled",  label: "Order cancelled",           desc: "If an order is cancelled" },
    ],
  },
  {
    title: "Promotions",
    icon: <FiTag size={15} />,
    items: [
      { key: "promo_weekly",   label: "Weekly deals",              desc: "New deals every week" },
      { key: "promo_flash",    label: "Flash sales",               desc: "Limited-time offers" },
    ],
  },
  {
    title: "Reminders",
    icon: <FiTruck size={15} />,
    items: [
      { key: "delivery_slot",  label: "Delivery slot reminder",    desc: "Reminder before your slot" },
      { key: "reorder",        label: "Reorder reminder",          desc: "Remind me to reorder regulars" },
    ],
  },
];

const CHANNELS = [
  { key: "email",    icon: <FiMail size={14} />,          label: "Email" },
  { key: "whatsapp", icon: <FiMessageCircle size={14} />, label: "WhatsApp" },
  { key: "push",     icon: <FiSmartphone size={14} />,    label: "Push" },
];

export default function Notifications() {
  // default all on
  const [prefs, setPrefs] = useState(() => {
    const init = {};
    NOTIF_SECTIONS.forEach((s) =>
      s.items.forEach((item) =>
        CHANNELS.forEach((ch) => {
          init[`${item.key}_${ch.key}`] = true;
        })
      )
    );
    return init;
  });

  const toggle = (key) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-500 text-sm mt-0.5">Choose how and when we reach you</p>
      </div>

      {/* Coming-soon notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100
                      rounded-xl px-4 py-3 mb-6 text-sm text-blue-700">
        <FiInfo size={15} className="mt-0.5 flex-shrink-0" />
        <p>
          Notification delivery is not yet active — these settings will take effect once
          the messaging system is live.
        </p>
      </div>

      <div className="space-y-4">
        {NOTIF_SECTIONS.map((section) => (
          <div key={section.title} className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-brand-500">{section.icon}</span>
              <h3 className="font-semibold text-gray-800 text-sm">{section.title}</h3>
            </div>

            {/* Channel headers */}
            <div className="grid gap-y-4">
              {section.items.map((item) => (
                <div key={item.key}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {CHANNELS.map((ch) => (
                        <label
                          key={ch.key}
                          className="flex flex-col items-center gap-1 cursor-pointer group"
                          title={ch.label}>
                          <span className={`text-xs transition-colors
                            ${prefs[`${item.key}_${ch.key}`]
                              ? "text-brand-500"
                              : "text-gray-300"}`}>
                            {ch.icon}
                          </span>
                          <input
                            type="checkbox"
                            checked={prefs[`${item.key}_${ch.key}`]}
                            onChange={() => toggle(`${item.key}_${ch.key}`)}
                            className="sr-only"
                          />
                          <span className={`w-8 h-4 rounded-full transition-colors
                            ${prefs[`${item.key}_${ch.key}`]
                              ? "bg-brand-500"
                              : "bg-gray-200"}`} />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Channel legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
              {CHANNELS.map((ch) => (
                <div key={ch.key} className="flex items-center gap-1 text-xs text-gray-400">
                  {ch.icon} {ch.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <button
          className="btn-primary"
          onClick={() => toast.success("Preferences saved!")}>
          Save preferences
        </button>
      </div>
    </div>
  );
}
