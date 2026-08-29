import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiTruck, FiSave, FiPackage, FiSearch } from "react-icons/fi";
import { getProducts } from "../../api/products";
import {
  getProductDeliveryRule,
  updateProductDeliveryRule,
} from "../../api/admin";

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function DeliveryRules() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [loadingRule, setLoadingRule] = useState(false);
  const [saving, setSaving] = useState(false);

  const [restockCycle, setRestockCycle] = useState("none");
  const [restockDayOfWeek, setRestockDayOfWeek] = useState(0);
  const [restockDayOfMonth, setRestockDayOfMonth] = useState(1);
  const [minLeadDays, setMinLeadDays] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    getProducts()
      .then((res) => setProducts(res.data.products || []))
      .catch(() => toast.error("Could not load products."))
      .finally(() => setLoadingProducts(false));
  }, []);

  const selectedProduct = products.find(
    (p) => p.id === Number(selectedProductId)
  );

  const loadRule = (productId) => {
    setLoadingRule(true);
    getProductDeliveryRule(productId)
      .then((res) => {
        const rule = res.data;
        setRestockCycle(rule.restock_cycle || "none");
        setRestockDayOfWeek(
          rule.restock_day_of_week != null ? rule.restock_day_of_week : 0
        );
        setRestockDayOfMonth(
          rule.restock_day_of_month != null ? rule.restock_day_of_month : 1
        );
        setMinLeadDays(rule.min_lead_days ?? 0);
        setUpdatedAt(rule.updated_at || null);
      })
      .catch(() => toast.error("Could not load delivery rule."))
      .finally(() => setLoadingRule(false));
  };

  const handleSelectProduct = (id) => {
    setSelectedProductId(id);
    if (id) loadRule(id);
  };

  const handleSave = async () => {
    if (!selectedProductId) {
      toast.error("Please select a product first.");
      return;
    }

    const payload = {
      restock_cycle: restockCycle,
      min_lead_days: Number(minLeadDays) || 0,
      restock_day_of_week:
        restockCycle === "weekly" ? Number(restockDayOfWeek) : null,
      restock_day_of_month:
        restockCycle === "monthly" ? Number(restockDayOfMonth) : null,
    };

    setSaving(true);
    try {
      const res = await updateProductDeliveryRule(selectedProductId, payload);
      setUpdatedAt(res.data.rule?.updated_at || null);
      toast.success("Delivery rule saved.");
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Could not save delivery rule."
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Rules</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure restock cycles and lead times that drive product
          availability for delivery and pickup.
        </p>
      </div>

      {/* Product picker */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          Product
        </label>

        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl
                       text-sm outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {loadingProducts ? (
          <p className="text-sm text-gray-400">Loading products…</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-gray-400">No products match "{search}".</p>
        ) : (
          <select
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl
                       text-sm outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Select a product…</option>
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {selectedProduct && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <FiPackage size={14} />
            Stock:{" "}
            <span className="font-semibold text-gray-800">
              {selectedProduct.stock_quantity ?? "Untracked"}
            </span>
          </div>
        )}
      </div>

      {/* Rule editor */}
      {selectedProductId && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiTruck className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">
              Delivery / Restock Rule
            </h2>
          </div>

          {loadingRule ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              Loading rule…
            </p>
          ) : (
            <div className="space-y-4">
              {/* Restock cycle */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Restock cycle
                </label>
                <select
                  value={restockCycle}
                  onChange={(e) => setRestockCycle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl
                             text-sm outline-none focus:ring-2 focus:ring-brand-100"
                >
                  <option value="none">None</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  When to expect new stock, once this product runs out.
                  "None" means no restock date can be computed — it'll show
                  as unavailable once stock hits zero.
                </p>
              </div>

              {/* Weekly day */}
              {restockCycle === "weekly" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Restock day
                  </label>
                  <select
                    value={restockDayOfWeek}
                    onChange={(e) => setRestockDayOfWeek(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl
                               text-sm outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Monthly day */}
              {restockCycle === "monthly" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Restock day of month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={restockDayOfMonth}
                    onChange={(e) => setRestockDayOfMonth(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl
                               text-sm outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    If a month is shorter than this day, the last day of
                    that month is used instead.
                  </p>
                </div>
              )}

              {/* Min lead days */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Minimum delivery lead time (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minLeadDays}
                  onChange={(e) => setMinLeadDays(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl
                             text-sm outline-none focus:ring-2 focus:ring-brand-100"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Applied only to delivery orders — pickup orders always
                  skip this lead time and are ready as soon as the product
                  is in stock (today) or restocked.
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
                {saving ? "Saving…" : "Save Delivery Rule"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}