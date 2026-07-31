import { useState } from "react";
import toast from "react-hot-toast";
import {
  FiPlus, FiMinus, FiShoppingCart, FiSearch,
  FiClock, FiAward, FiThumbsUp, FiTruck,
} from "react-icons/fi";

const CATEGORIES = ["All", "Vegetables", "Fruits", "Dairy", "Grains", "Spices", "Snacks"];

const PRODUCTS = [
  { id: 1,  name: "Fresh Tomatoes",        cat: "Vegetables", emoji: "🍅", price: 2.49,  unit: "lb",   diet: "veg" },
  { id: 2,  name: "Onions",                cat: "Vegetables", emoji: "🧅", price: 1.29,  unit: "lb",   diet: "veg" },
  { id: 3,  name: "Potatoes",              cat: "Vegetables", emoji: "🥔", price: 1.99,  unit: "lb",   diet: "veg" },
  { id: 4,  name: "Cilantro",              cat: "Vegetables", emoji: "🌿", price: 0.99,  unit: "bunch", diet: "veg" },
  { id: 5,  name: "Green Chili",           cat: "Vegetables", emoji: "🫑", price: 1.49,  unit: "lb",   diet: "veg" },
  { id: 6,  name: "Cucumber",              cat: "Vegetables", emoji: "🥒", price: 1.19,  unit: "lb",   diet: "veg" },
  { id: 7,  name: "Bananas",               cat: "Fruits",     emoji: "🍌", price: 0.59,  unit: "lb",   diet: "veg" },
  { id: 8,  name: "Apples (Gala)",         cat: "Fruits",     emoji: "🍎", price: 2.99,  unit: "lb",   diet: "veg" },
  { id: 9,  name: "Mangoes (Alphonso)",    cat: "Fruits",     emoji: "🥭", price: 3.49,  unit: "each", diet: "veg" },
  { id: 10, name: "Whole Milk",            cat: "Dairy",      emoji: "🥛", price: 3.99,  unit: "gal",  diet: "veg" },
  { id: 11, name: "Curd / Yogurt",         cat: "Dairy",      emoji: "🥣", price: 2.29,  unit: "qt",   diet: "veg" },
  { id: 12, name: "Paneer",                cat: "Dairy",      emoji: "🧀", price: 4.99,  unit: "lb",   diet: "veg" },
  { id: 13, name: "Basmati Rice",          cat: "Grains",     emoji: "🍚", price: 8.99,  unit: "5lb",  diet: "veg" },
  { id: 14, name: "Toor Dal",              cat: "Grains",     emoji: "🥜", price: 4.49,  unit: "lb",   diet: "veg" },
  { id: 15, name: "Wheat Atta",            cat: "Grains",     emoji: "🌾", price: 6.99,  unit: "5lb",  diet: "veg" },
  { id: 16, name: "Turmeric Powder",       cat: "Spices",     emoji: "🟡", price: 2.79,  unit: "200g", diet: "veg" },
  { id: 17, name: "Red Chili Powder",      cat: "Spices",     emoji: "🌶️", price: 2.99, unit: "200g", diet: "veg" },
  { id: 18, name: "Cumin Seeds (Jeera)",   cat: "Spices",     emoji: "⚫", price: 3.49,  unit: "200g", diet: "veg" },
  { id: 19, name: "Chicken (Leg Quarters)", cat: "Snacks",    emoji: "🍗", price: 2.99,  unit: "lb",   diet: "nonveg" },
  { id: 20, name: "Eggs (Dozen)",          cat: "Snacks",     emoji: "🥚", price: 3.49,  unit: "12",   diet: "nonveg" },
  { id: 21, name: "Murukulu",              cat: "Snacks",     emoji: "🥨", price: 5.99,  unit: "pack", diet: "veg" },
  { id: 22, name: "Biscuits (Parle-G)",    cat: "Snacks",     emoji: "🍪", price: 1.99,  unit: "pack", diet: "veg" },
];

export default function Home() {
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = PRODUCTS.filter(
    (p) =>
      (category === "All" || p.cat === category) &&
      p.name.toLowerCase().includes(search.toLowerCase())
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

  const checkout = () => {
    if (cartCount === 0) return toast("Your cart is empty — add some items first!", { icon: "🛒" });
    toast.success(`Ordering ${cartCount} item${cartCount > 1 ? "s" : ""} — checkout coming soon!`);
  };

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
          onClick={checkout}
          className="btn-primary flex items-center gap-2">
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
        {CATEGORIES.map((c) => (
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

      {/* Product grid */}
      {filtered.length === 0 ? (
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
                <div className="flex items-start justify-between mb-3">
                  <span className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-3xl">
                    {p.emoji}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full
                    ${p.diet === "veg"
                      ? "bg-green-50 text-green-600 border border-green-200"
                      : "bg-red-50 text-red-600 border border-red-200"}`}>
                    {p.diet === "veg" ? "Veg" : "Non-veg"}
                  </span>
                </div>

                <p className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.cat} · per {p.unit}</p>

                <div className="mt-3 flex items-center justify-between">
                  <p className="font-bold text-gray-900">
                    ${p.price.toFixed(2)}
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
    </div>
  );
}
