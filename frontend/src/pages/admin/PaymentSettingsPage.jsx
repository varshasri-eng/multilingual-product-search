import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiSave, FiCreditCard } from "react-icons/fi";
import { getPaymentSettings } from "../../api/settings";
import { updatePaymentSettings } from "../../api/admin";

export default function PaymentSettingsPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPaymentSettings()
      .then((res) => {
        setQrCodeUrl(res.data.qr_code_url || "");
        setInstructions(res.data.instructions || "");
        setUpdatedAt(res.data.updated_at || null);
      })
      .catch(() => toast.error("Could not load payment settings."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updatePaymentSettings({
        qr_code_url: qrCodeUrl.trim(),
        instructions: instructions.trim(),
      });
      setUpdatedAt(res.data.settings?.updated_at || null);
      toast.success("Payment settings saved.");
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Could not save payment settings."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          The QR code and instructions shown to customers on every invoice.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
        ) : (
          <div className="space-y-5">
            {/* QR URL */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                QR code URL
              </label>
              <input
                type="text"
                value={qrCodeUrl}
                onChange={(e) => setQrCodeUrl(e.target.value)}
                placeholder="/static/uploads/payment_screenshots/qr.png"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl
                           text-sm outline-none focus:ring-2 focus:ring-brand-100"
              />
              <p className="text-xs text-gray-400 mt-1">
                Point this at wherever the QR image file actually lives —
                e.g. a path served by your backend's <code>/static</code>{" "}
                folder, or any externally-hosted image URL. This field only
                stores the URL; it doesn't upload a file.
              </p>
            </div>

            {/* Preview */}
            {qrCodeUrl && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                  Preview
                </p>
                <img
                  src={qrCodeUrl}
                  alt="QR code preview"
                  className="w-40 h-40 object-contain rounded-xl border border-gray-200 bg-gray-50 p-2"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Instructions */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Instructions (optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Pay to UPI ID: store2home@okaxis, or Zelle: Delivery Hub LLC"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl
                           text-sm outline-none focus:ring-2 focus:ring-brand-100 h-24 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Shown under the QR on the customer's invoice, next to the
                upload/note form.
              </p>
            </div>

            {updatedAt && (
              <p className="text-xs text-gray-400">
                Last updated: {new Date(updatedAt).toLocaleString()}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                         bg-brand-600 text-white text-sm font-semibold
                         hover:bg-brand-700 disabled:opacity-50"
            >
              <FiSave size={15} />
              {saving ? "Saving…" : "Save Payment Settings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}