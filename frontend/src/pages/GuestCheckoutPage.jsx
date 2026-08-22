import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowLeft, FiShoppingCart, FiPlus, FiMinus, FiX, FiCheckCircle,
  FiTruck as FiDelivery, FiPackage, FiCalendar, FiClock, FiUser, FiMail, FiPhone,
  FiMapPin,
} from "react-icons/fi";
import { getProducts, getAvailability } from "../api/products";
import { createGuestOrder } from "../api/orders";

const TIME_SLOTS = ["Morning 9-12", "Afternoon 12-4", "Evening 4-7"];
const todayISO = () => new Date().toISOString().split("T")[0];

const formatISODate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

// ProductDeliveryRule uses 0=Sunday ... 6=Saturday.
const getNextRestockDate = (availability) => {
  const cycle = availability?.restock_cycle;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (cycle === "weekly" && availability.restock_day_of_week != null) {
    const target = Number(availability.restock_day_of_week);
    if (!Number.isInteger(target) || target < 0 || target > 6) return null;

    const delta = (target - today.getDay() + 7) % 7;
    const restock = new Date(today);
    restock.setDate(today.getDate() + delta);
    restock.setDate(restock.getDate() + Number(availability.min_lead_days || 0));
    return formatISODate(restock);
  }

  if (cycle === "monthly" && availability.restock_day_of_month != null) {
    const target = Number(availability.restock_day_of_month);
    if (!Number.isInteger(target) || target < 1 || target > 31) return null;

    const makeCandidate = (year, month) => {
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(target, lastDay);
      return new Date(year, month, day);
    };

    let restock = makeCandidate(today.getFullYear(), today.getMonth());
    if (restock < today) {
      restock = makeCandidate(today.getFullYear(), today.getMonth() + 1);
    }
    restock.setDate(restock.getDate() + Number(availability.min_lead_days || 0));
    return formatISODate(restock);
  }

  return null;
};


function getGuestCart() {
  try { return JSON.parse(localStorage.getItem("s2h_guest_cart") || "{}"); } catch { return {}; }
}

export default function GuestCheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(getGuestCart);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);

  // order form
  const [orderType, setOrderType] = useState("delivery");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [availabilityByProduct, setAvailabilityByProduct] = useState({});
  const [deliveryDateByProduct, setDeliveryDateByProduct] = useState({});

  useEffect(() => {
    getProducts()
      .then((r) => setProducts(r.data.products))
      .catch(() => toast.error("Failed to load products."))
      .finally(() => setLoading(false));
  }, []);

  const cartAvailabilityKey = Object.entries(cart)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, qty]) => `${id}:${qty}`)
    .join(",");

  useEffect(() => {
    if (!products.length) return;

    const ids = cartAvailabilityKey
      ? cartAvailabilityKey.split(",").map((entry) => Number(entry.split(":")[0])).filter(Boolean)
      : [];

    if (!ids.length) {
      setAvailabilityByProduct({});
      setDeliveryDateByProduct({});
      return;
    }

    let cancelled = false;

    const loadAvailability = async () => {
      const next = {};
      await Promise.all(ids.map(async (id) => {
        next[id] = { status: "loading", data: null };
        try {
          const res = await getAvailability(id);
          if (cancelled) return;

          const data = res.data;
          const quantity = Number(cart[id] || 0);
          const sufficientStock =
            data.stock_quantity == null || Number(data.stock_quantity) >= quantity;

          const earliest = sufficientStock
            ? data.earliest_delivery_date
            : getNextRestockDate(data);

          next[id] = {
            status: earliest ? "ready" : "unavailable",
            data: {
              ...data,
              in_stock_for_quantity: sufficientStock,
              earliest_delivery_date: earliest,
            },
          };
        } catch (error) {
          if (!cancelled) next[id] = { status: "error", data: null };
        }
      }));

      if (!cancelled) {
        setAvailabilityByProduct(next);
        setDeliveryDateByProduct((prev) => {
          const updated = {};
          ids.forEach((id) => {
            const earliest = next[id]?.data?.earliest_delivery_date;
            updated[id] = earliest
              ? (!prev[id] || prev[id] < earliest ? earliest : prev[id])
              : "";
          });
          return updated;
        });
      }
    };

    loadAvailability();

    return () => { cancelled = true; };
  }, [cartAvailabilityKey, products.length]);

  const retryAvailability = async (id) => {
    setAvailabilityByProduct((prev) => ({
      ...prev,
      [id]: { status: "loading", data: null },
    }));
    try {
      const res = await getAvailability(id);
      const data = res.data;
      const quantity = Number(cart[id] || 0);
      const sufficientStock =
        data.stock_quantity == null || Number(data.stock_quantity) >= quantity;
      const earliest = sufficientStock
        ? data.earliest_delivery_date
        : getNextRestockDate(data);
      setAvailabilityByProduct((prev) => ({
        ...prev,
        [id]: {
          status: earliest ? "ready" : "unavailable",
          data: {
            ...data,
            in_stock_for_quantity: sufficientStock,
            earliest_delivery_date: earliest,
          },
        },
      }));
      if (earliest) {
        setDeliveryDateByProduct((prev) => ({ ...prev, [id]: prev[id] || earliest }));
      }
    } catch {
      setAvailabilityByProduct((prev) => ({
        ...prev,
        [id]: { status: "error", data: null },
      }));
    }
  };

  const items = Object.entries(cart)
    .map(([id, qty]) => {
      const p = products.find((x) => x.id === Number(id));
      return p ? { ...p, quantity: qty, line_total: Number(p.price) * qty } : null;
    })
    .filter(Boolean);

  const availabilityBlockedItems = items.filter((i) => {
    const a = availabilityByProduct[i.id];
    return !a || a.status !== "ready" || !deliveryDateByProduct[i.id];
  });

  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const deliveryFee = orderType === "delivery" ? 2.99 : 0;
  const total = subtotal + deliveryFee;

  const updateQty = (id, delta) =>
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      localStorage.setItem("s2h_guest_cart", JSON.stringify(copy));
      return copy;
    });

  const removeItem = (id) =>
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      localStorage.setItem("s2h_guest_cart", JSON.stringify(copy));
      return copy;
    });

  const cartCount = items.reduce((a, i) => a + i.quantity, 0);

  const placeOrder = async () => {
    if (!name.trim()) return toast.error("Please enter your name.");
    if (!email.trim()) return toast.error("Please enter your email.");
    if (orderType === "delivery") {
      if (!addr1.trim()) return toast.error("Please enter your street address.");
      if (!city.trim()) return toast.error("Please enter your city.");
      if (!zip.trim()) return toast.error("Please enter your zip code.");
    }
    if (availabilityBlockedItems.length > 0) {
      return toast.error("Please resolve product availability before placing the order.");
    }

    setPlacing(true);
    try {
      const payload = {
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
          delivery_date: deliveryDateByProduct[i.id],
        })),
        order_type: orderType,
        guest_name: name.trim(),
        guest_email: email.trim(),
        guest_phone: phone.trim() || null,
        requested_date: date || null,
        requested_time_slot: slot || null,
        notes: notes.trim() || null,
      };
      if (orderType === "delivery") {
        payload.address_line1 = addr1.trim();
        payload.address_line2 = addr2.trim() || null;
        payload.city = city.trim();
        payload.state = state.trim();
        payload.zip_code = zip.trim();
      }
      const res = await createGuestOrder(payload);
      setPlaced(res.data.order);
      localStorage.removeItem("s2h_guest_cart");
      toast.success(`Order ${res.data.order.order_number} placed!`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not place order.");
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-green-50 text-green-600 mb-5">
            <FiCheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order placed!</h2>
          <p className="text-gray-500 text-sm mb-1">
            Your order <span className="font-semibold text-gray-800">{placed.order_number}</span>
          </p>
          <p className="text-gray-400 text-sm mb-6">
            A confirmation will be sent to <span className="font-medium text-gray-600">{email}</span>
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate("/shop")}
              className="btn-primary w-full">
              Continue shopping
            </button>
            <button
              onClick={() => navigate("/")}
              className="btn-secondary w-full">
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center max-w-md w-full">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-gray-600 font-semibold mb-2">Your cart is empty</p>
          <p className="text-gray-400 text-sm mb-6">Add some products to get started.</p>
          <button onClick={() => navigate("/shop")} className="btn-primary">
            Browse products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navbar ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex items-center px-4 sm:px-6 h-16 gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <span className="text-lg font-bold text-gray-900">Checkout</span>
          <span className="ml-auto text-sm text-gray-400">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* ── Left: form ──────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">
            {/* Contact info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <FiUser size={14} className="text-brand-500" />
                Contact information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Full name *</label>
                  <div className="relative">
                    <FiUser size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="input !pl-9" placeholder="John Doe" value={name}
                      onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Email *</label>
                    <div className="relative">
                      <FiMail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="input !pl-9" type="email" placeholder="you@example.com" value={email}
                        onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <div className="relative">
                      <FiPhone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="input !pl-9" type="tel" placeholder="(209) 555-0123" value={phone}
                        onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order type */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Fulfillment
              </h3>
              <div className="flex gap-3">
                {[
                  { key: "delivery", label: "Delivery", icon: <FiDelivery size={15} /> },
                  { key: "pickup", label: "Pickup", icon: <FiPackage size={15} /> },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setOrderType(t.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors
                      ${orderType === t.key
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Address */}
            {orderType === "delivery" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FiMapPin size={14} className="text-brand-500" />
                  Delivery address
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Street address *</label>
                    <input className="input" placeholder="123 Main St" value={addr1}
                      onChange={(e) => setAddr1(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Apt / Suite / Unit</label>
                    <input className="input" placeholder="Apt 4B" value={addr2}
                      onChange={(e) => setAddr2(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-3">
                      <label className="label">City *</label>
                      <input className="input" placeholder="Lathrop" value={city}
                        onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <label className="label">State</label>
                      <input className="input" value={state}
                        onChange={(e) => setState(e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Zip *</label>
                      <input className="input" placeholder="95330" value={zip}
                        onChange={(e) => setZip(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scheduling */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Schedule (optional)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <FiCalendar size={13} className="text-gray-400" /> Date
                  </label>
                  <input type="date" className="input" min={todayISO()} value={date}
                    onChange={(e) => setDate(e.target.value)} />
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
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Order notes (optional)
              </h3>
              <textarea className="input !h-20 resize-none" placeholder="Any special instructions…"
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {/* ── Right: order summary ────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Order summary
              </h3>

              <div className="space-y-3 mb-5">
                {items.map((i) => {
                  const availability = availabilityByProduct[i.id];
                  const earliest = availability?.data?.earliest_delivery_date;
                  const isBackorder = availability?.status === "ready"
                    && availability.data
                    && availability.data.in_stock_for_quantity === false;

                  return (
                    <div key={i.id} className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{i.emoji || "🛒"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{i.name}</p>
                          {isBackorder && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                              Backorder
                            </span>
                          )}
                        </div>

                        {availability?.status === "loading" && (
                          <p className="text-xs text-gray-400 mt-1">Checking availability…</p>
                        )}
                        {availability?.status === "error" && (
                          <button
                            type="button"
                            onClick={() => retryAvailability(i.id)}
                            className="text-xs text-red-600 hover:underline mt-1">
                            Couldn't check availability — Retry
                          </button>
                        )}
                        {availability?.status === "unavailable" && (
                          <p className="text-xs text-red-600 mt-1">
                            Currently unavailable — please remove this item or contact us.
                          </p>
                        )}
                        {availability?.status === "ready" && earliest && (
                          <div className="mt-2 rounded-lg bg-gray-50 p-2">
                            <p className="text-xs text-gray-500">
                              {isBackorder ? "Next available:" : "Earliest delivery:"}{" "}
                              <span className="font-semibold text-gray-800">
                                {formatDisplayDate(earliest)}
                              </span>
                            </p>
                            <input
                              type="date"
                              className="input mt-1.5 text-xs"
                              min={earliest}
                              value={deliveryDateByProduct[i.id] || earliest}
                              onChange={(e) =>
                                setDeliveryDateByProduct((prev) => ({
                                  ...prev,
                                  [i.id]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mt-2">
                          <button onClick={() => updateQty(i.id, -1)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200
                                       flex items-center justify-center transition-colors">
                            <FiMinus size={11} />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{i.quantity}</span>
                          <button onClick={() => updateQty(i.id, 1)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200
                                       flex items-center justify-center transition-colors">
                            <FiPlus size={11} />
                          </button>
                          <button onClick={() => removeItem(i.id)}
                            className="ml-auto text-gray-400 hover:text-red-500 transition-colors">
                            <FiX size={14} />
                          </button>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                        ${i.line_total.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{orderType === "delivery" ? "Delivery fee" : "Pickup"}</span>
                  <span>{orderType === "delivery" ? `$${deliveryFee.toFixed(2)}` : "Free"}</span>
                </div>
                <div className="flex justify-between text-gray-900 font-bold text-base pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
                onClick={placeOrder}
                disabled={placing || cartCount === 0 || availabilityBlockedItems.length > 0}>
                <FiShoppingCart size={15} />
                {placing ? "Placing order…" : `Place order · $${total.toFixed(2)}`}
              </button>

              <p className="text-[11px] text-gray-400 text-center mt-3">
                By placing this order you agree to our terms of service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
