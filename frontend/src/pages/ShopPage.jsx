import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiPlus, FiMinus, FiShoppingCart, FiSearch, FiX,
} from "react-icons/fi";
import { getProducts, getCategories } from "../api/products";
import { useBranding } from "../context/BrandingContext";
import BrandLogo from "../components/BrandLogo";

export default function ShopPage() {
  const navigate = useNavigate();
  const { settings } = useBranding();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("s2h_guest_cart") || "{}"); } catch { return {}; }
  });
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getCategories()
      .then((r) => setCategories(r.data.categories))
      .catch(() => {});
    getProducts()
      .then((r) => setProducts(r.data.products))
      .catch(() => toast.error("Failed to load products."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("s2h_guest_cart", JSON.stringify(cart));
  }, [cart]);

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

  const list = search.trim() ? (searchResults ?? []) : products;
  const filtered = list.filter(
    (p) => (category === "All" || p.category === category)
  );

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find((x) => x.id === Number(id));
    return sum + (p ? Number(p.price) * qty : 0);
  }, 0);

  const updateQty = (id, delta) =>
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navbar ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo size="md" />
            <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">{settings.site_name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors px-3 py-2">
              Sign in
            </button>
            {cartCount > 0 && (
              <button
                onClick={() => navigate("/checkout")}
                className="relative flex items-center gap-2 bg-brand-500 hover:bg-brand-600
                           text-white font-semibold px-4 py-2.5 rounded-full transition-all shadow-sm text-sm">
                <FiShoppingCart size={15} />
                Cart ({cartCount})
                <span className="ml-1 font-bold">${cartTotal.toFixed(2)}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Search ────────────────────────────────────── */}
        <div className="relative mb-3">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-gray-200 bg-white
                       shadow-sm text-sm placeholder-gray-400
                       focus:outline-none focus:ring-4 focus:ring-brand-500/15 focus:border-brand-500
                       transition-all"
            placeholder="Search in English, Telugu, Hindi or Tamil…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full
                         bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center
                         justify-center transition-colors"
              aria-label="Clear search">
              <FiX size={14} />
            </button>
          )}
        </div>

        {search.trim() ? (
          <p className="text-xs text-gray-400 mb-4">
            Showing results for <span className="text-gray-600 font-semibold">"{search}"</span> —
            try <span className="text-brand-600 font-medium">పసుపు</span>,{" "}
            <span className="text-brand-600 font-medium">हल्दी</span> or{" "}
            <span className="text-brand-600 font-medium">மஞ்சள்</span>
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
            {catNames.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${category === c
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900"}`}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* ── Products ──────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-gray-100 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-5 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-600 font-semibold">No products found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search.trim() ? "Try a different search — maybe in another language?" : "Try a different category"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const qty = cart[p.id] || 0;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm
                                           hover:shadow-md hover:-translate-y-0.5 transition-all
                                           p-4 flex flex-col">
                  <div
                    className="cursor-pointer flex-1"
                    onClick={() => navigate(`/shop/${p.id}`)}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-50 to-orange-100
                                       flex items-center justify-center text-3xl">
                        {p.emoji || "🛒"}
                      </span>
                      <span
                        className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0
                          ${p.diet === "veg" ? "border-green-500" : "border-red-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full
                          ${p.diet === "veg" ? "bg-green-500" : "bg-red-500"}`} />
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.category} · {p.unit}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <p className="font-bold text-gray-900">
                      ${Number(p.price).toFixed(2)}
                    </p>
                    {qty === 0 ? (
                      <button
                        onClick={() => updateQty(p.id, 1)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-600
                                   bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors">
                        <FiPlus size={13} /> Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-brand-500 text-white rounded-full px-1.5 py-1">
                        <button onClick={() => updateQty(p.id, -1)}
                          className="p-1 hover:bg-brand-600 rounded-full transition-colors">
                          <FiMinus size={12} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{qty}</span>
                        <button onClick={() => updateQty(p.id, 1)}
                          className="p-1 hover:bg-brand-600 rounded-full transition-colors">
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
      </div>

      {/* ── Sticky cart bar ─────────────────────────────── */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200
                        shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 sm:px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</p>
              <p className="text-xs text-gray-500">Subtotal: <span className="font-semibold">${cartTotal.toFixed(2)}</span></p>
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className="btn-primary !px-6 !py-2.5 rounded-full flex items-center gap-2 text-sm">
              <FiShoppingCart size={15} />
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
