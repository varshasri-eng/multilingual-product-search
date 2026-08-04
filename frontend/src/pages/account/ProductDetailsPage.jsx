import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiArrowLeft, FiShoppingCart, FiPlus, FiMinus } from "react-icons/fi";
import {
  getProduct, getRelated, getRecentlyViewed, getSessionId,
} from "../../api/products";

function ProductCard({ p, onClick }) {
  return (
    <button
      key={p.product_id ?? p.id}
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col
                 items-start text-left hover:shadow-md hover:-translate-y-0.5 transition-all">
      <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-50 to-orange-100
                       flex items-center justify-center text-2xl mb-2.5">
        {p.emoji || "🛒"}
      </span>
      <p className="text-sm font-semibold text-gray-900 leading-snug">{p.product_name || p.name}</p>
      <p className="text-xs text-gray-400 mt-0.5">${Number(p.price).toFixed(2)}/{p.unit || "each"}</p>
      {p.source && (
        <span className={`mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full
          ${p.source === "history" ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-700"}`}>
          {p.source === "history" ? "Because you viewed" : "Same category"}
        </span>
      )}
    </button>
  );
}

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sessionId = getSessionId();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getProduct(id, sessionId),
      getRelated(id, sessionId),
      getRecentlyViewed(sessionId),
    ])
      .then(([p, r, rv]) => {
        setProduct(p.data.product);
        setRelated(r.data.results || []);
        setRecent(rv.data.results || []);
      })
      .catch(() => toast.error("Could not load product."))
      .finally(() => setLoading(false));
  }, [id]);

  const addToCart = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "{}");
      cart[product.id] = (cart[product.id] || 0) + qty;
      localStorage.setItem("cart", JSON.stringify(cart));
      toast.success(`${product.name} added to cart.`);
    } catch {
      toast.error("Could not update cart.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-24 mb-4" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-28 h-28 rounded-2xl bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-100 rounded w-1/2" />
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-8 bg-gray-100 rounded w-24" />
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center max-w-4xl mx-auto">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-gray-600 font-semibold">Product not found</p>
        <Link to="/account/home" className="inline-block text-brand-600 font-semibold text-sm mt-3">
          ← Back to store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
        <FiArrowLeft size={15} /> Back
      </button>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-brand-50 to-orange-100
                          flex items-center justify-center text-6xl flex-shrink-0">
            {product.emoji || "🛒"}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <span
                className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center
                  ${product.diet === "veg" ? "border-green-500" : "border-red-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full
                  ${product.diet === "veg" ? "bg-green-500" : "bg-red-500"}`} />
              </span>
            </div>
            <p className="text-sm text-gray-500">{product.category} · {product.unit}</p>
            <p className="mt-3 font-bold text-2xl text-gray-900">
              ${Number(product.price).toFixed(2)}
              <span className="text-sm text-gray-400 font-normal">/{product.unit}</span>
            </p>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        </div>

        {/* Add to cart */}
        <div className="mt-6 pt-5 border-t border-gray-50 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-1.5 py-1.5">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-1.5 hover:bg-white rounded-full transition-colors">
              <FiMinus size={14} className="text-gray-500" />
            </button>
            <span className="text-sm font-bold w-6 text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="p-1.5 hover:bg-white rounded-full transition-colors">
              <FiPlus size={14} className="text-gray-500" />
            </button>
          </div>
          <button
            onClick={addToCart}
            className="btn-primary flex items-center gap-2 rounded-full">
            <FiShoppingCart size={15} /> Add to cart · ${(Number(product.price) * qty).toFixed(2)}
          </button>
        </div>

        {/* Alias chips */}
        {product.aliases && product.aliases.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Also known as
            </p>
            <div className="flex flex-wrap gap-2">
              {product.aliases.map((a) => (
                <span key={a} className="px-2.5 py-1 rounded-full text-xs font-medium
                  bg-gray-50 text-gray-600 border border-gray-200">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">You may also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {related.map((p) => (
              <ProductCard key={p.product_id} p={p} onClick={() => navigate(`/account/products/${p.product_id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* Recently viewed */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Recently viewed</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recent.map((p) => (
              <ProductCard key={p.id} p={p} onClick={() => navigate(`/account/products/${p.id}`)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
