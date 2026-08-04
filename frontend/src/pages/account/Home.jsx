import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus, FiMinus, FiShoppingCart, FiSearch,
  FiClock, FiAward, FiThumbsUp, FiTruck,
  FiX, FiCheckCircle, FiTruck as FiDelivery, FiPackage, FiCalendar,
} from "react-icons/fi";
import { getProducts, getCategories } from "../../api/products";
import { createOrder } from "../../api/orders";
import { getAddresses } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";

const TIME_SLOTS = ["Morning 9-12", "Afternoon 12-4", "Evening 4-7"];

const deliveryFeeFor = (zip) => {
  if (!zip) return 2.99;
  if (zip === "95330") return 2.99;
  if (zip === "95391") return 3.99;
  return 2.99;
};

const todayISO = () => new Date().toISOString().split("T")[0];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "{}"); } catch { return {}; }
  });
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    getCategories()
      .then((r) => setCategories(r.data.categories))
      .catch(() => toast.error("Failed to load categories."));
    getProducts()
      .then((r) => setProducts(r.data.products))
      .catch(() => toast.error("Failed to load products."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Debounced multilingual server search (name + Telugu/Hindi/Tamil aliases)
  const [searchResults, setSearchResults] = useState(null);
  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults(null); return; }
    const t = setTimeout(() => {
      getProducts({ search: q })
        .then((r) => setSearchResults(r.data.products))
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const catNames = useMemo(
    () => ["All", ...categories.map((c) => c.name)],
    [categories]
  );

  const filtered = (search.trim() ? searchResults : products).filter(
    (p) => (category === "All" || p.category === category)
  );

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const updateQty = (id, delta) =>
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back! 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Pick from our daily essentials — delivered to Lathrop & Mountain House
          </p>
        </div>
        <button
          onClick={() => setShowCheckout(true)}
          className="btn-primary flex items-center gap-2"
          disabled={cartCount === 0}>
          <FiShoppingCart size={15} />
          {cartCount > 0 ? `View Cart (${cartCount})` : "My Cart"}
        </button>
      </div>

      {/* Perks strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <FiTruck size={16} />, label: "Same-day delivery", color: "text-brand-500 bg-brand-50" },
          { icon: <FiClock size={16} />, label: "Fresh every morning", color: "text-green-600 bg-green-50" },
          { icon: <FiAward size={16} />, label: "Quality checked", color: "text-purple-600 bg-purple-50" },
          { icon: <FiThumbsUp size={16} />, label: "Trusted by locals", color: "text-orange-500 bg-orange-50" },
        ].map((p) => (
          <div key={p.label} className="card flex items-center gap-2.5 py-3 px-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.color}`}>
              {p.icon}
            </span>
            <p className="text-xs font-medium text-gray-700">{p.label}</p>
          </div>
        ))}
      </div>

      {/* Category pills + search */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {catNames.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${category === c
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600"}`}>
            {c}
          </button>
        ))}
        <div className="relative ml-auto min-w-40">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
          <input
            className="input pl-8 h-9 text-sm"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {search.trim() && (
        <p className="text-xs text-gray-400 -mt-2 mb-4">
          Try searching in another language too — e.g.{" "}
          <span className="text-brand-600">పసుపు</span> (Turmeric, Telugu),{" "}
          <span className="text-brand-600">हल्दी</span> (Hindi),{" "}
          <span className="text-brand-600">மஞ்சள்</span> (Tamil)
        </p>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="card text-center py-16 text-gray-400">Loading products…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 font-medium">No products found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const qty = cart[p.id] || 0;
            return (
              <div key={p.id} className="card p-4 flex flex-col hover:shadow-lg
                                         hover:-translate-y-0.5 transition-all">
                <div
                  className="cursor-pointer flex-1"
                  onClick={() => navigate(`/account/products/${p.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-3xl">
                      {p.emoji || "🛒"}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full
                      ${p.diet === "veg"
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-red-50 text-red-600 border border-red-200"}`}>
                      {p.diet === "veg" ? "Veg" : "Non-veg"}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.category} · per {p.unit}</p>

                  {search.trim() && p.matched_term && (
                    <p className="mt-1.5 text-[10px] text-gray-500">
                      matched: <span className="font-semibold text-brand-600">"{p.matched_term}"</span>
                      {p.term_type && (
                        <span className="ml-1.5 uppercase tracking-wide font-semibold text-[9px] px-1.5 py-0.5 rounded-full border border-gray-200">
                          {p.term_type}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="font-bold text-gray-900">
                    ${Number(p.price).toFixed(2)}
                    <span className="text-xs text-gray-400 font-normal">/{p.unit}</span>
                  </p>

                  {qty === 0 ? (
                    <button
                      onClick={() => updateQty(p.id, 1)}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-600
                                 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors">
                      <FiPlus size={13} /> Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-brand-500 text-white rounded-lg px-1 py-1">
                      <button onClick={() => updateQty(p.id, -1)}
                        className="p-1 hover:bg-brand-600 rounded-md transition-colors">
                        <FiMinus size={12} />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{qty}</span>
                      <button onClick={() => updateQty(p.id, 1)}
                        className="p-1 hover:bg-brand-600 rounded-md transition-colors">
                        <FiPlus size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          products={products}
          onClose={() => setShowCheckout(false)}
          onClearCart={() => setCart({})}
        />
      )}
    </div>
  );
}

/* ── Checkout modal ─────────────────────────────────────────── */
function CheckoutModal({ cart, products, onClose, onClearCart }) {
  const { customer } = useAuth();
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState(customer?.default_order_type || "delivery");
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);

  const items = Object.entries(cart)
    .map(([id, qty]) => {
      const p = products.find((x) => x.id === Number(id));
      return p ? { ...p, quantity: qty, line_total: Number(p.price) * qty } : null;
    })
    .filter(Boolean);

  useEffect(() => {
    getAddresses()
      .then((res) => {
        const list = res.data.addresses || [];
        setAddresses(list);
        const def = list.find((a) => a.is_default) || list[0];
        if (def) setAddressId(def.id);
      })
      .catch(() => setAddresses([]));
  }, []);

  const selectedAddress = addresses.find((a) => a.id === Number(addressId));
  const deliveryFee = orderType === "delivery"
    ? deliveryFeeFor(selectedAddress?.address?.zip_code)
    : 0;
  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const total = subtotal + deliveryFee;

  const placeOrder = async () => {
    if (orderType === "delivery" && !addressId) {
      return toast.error("Please choose a delivery address.");
    }
    setPlacing(true);
    try {
      const res = await createOrder({
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        order_type: orderType,
        address_id: orderType === "delivery" ? addressId : null,
        requested_date: date || null,
        requested_time_slot: slot || null,
      });
      setPlaced(res.data.order);
      onClearCart();
      toast.success(`Order ${res.data.order.order_number} placed!`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not place order.");
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-green-50 text-green-600 mb-4">
            <FiCheckCircle size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Order placed!</h3>
          <p className="text-gray-500 text-sm">
            Your order <span className="font-semibold text-gray-800">{placed.order_number}</span> is
            {placed.order_type === "delivery" ? " being prepared for delivery." : " ready for pickup."}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button className="btn-primary" onClick={() => navigate("/account/orders")}>
              View My Orders
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Keep Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">Checkout</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Items */}
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Your Items ({items.length})
            </p>
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-800">
                    <span className="text-lg">{i.emoji || "🛒"}</span>
                    {i.name}
                    <span className="text-gray-400 text-xs">× {i.quantity}</span>
                  </span>
                  <span className="font-semibold text-gray-900">
                    ${i.line_total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Order type */}
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Fulfillment
            </p>
            <div className="flex gap-3">
              {[
                { key: "delivery", label: "Delivery", icon: <FiDelivery size={15} /> },
                { key: "pickup", label: "Pickup", icon: <FiPackage size={15} /> },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setOrderType(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors
                    ${orderType === t.key
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Address (delivery only) */}
          {orderType === "delivery" && (
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Delivery Address
              </p>
              {addresses.length === 0 ? (
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500">
                  No saved addresses.{" "}
                  <button
                    className="text-brand-600 font-semibold hover:underline"
                    onClick={() => { onClose(); navigate("/account/addresses"); }}>
                    Add one →
                  </button>
                </div>
              ) : (
                <select
                  className="input"
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value)}>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} — {a.address?.address_line1}, {a.address?.city} {a.address?.zip_code}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Scheduling (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1.5">
                <FiCalendar size={13} className="text-gray-400" /> Delivery date
              </label>
              <input
                type="date"
                className="input"
                min={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <FiClock size={13} className="text-gray-400" /> Time slot
              </label>
              <select className="input" value={slot} onChange={(e) => setSlot(e.target.value)}>
                <option value="">Any time</option>
                {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{orderType === "delivery" ? "Delivery fee" : "Pickup"}</span>
              <span>{orderType === "delivery" ? `$${deliveryFee.toFixed(2)}` : "Free"}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold pt-1.5 border-t border-gray-200">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            className="btn-primary w-full flex items-center justify-center gap-2"
            onClick={placeOrder}
            disabled={placing || (orderType === "delivery" && !addressId)}>
            <FiShoppingCart size={15} />
            {placing ? "Placing order…" : `Place order · $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
