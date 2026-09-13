import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiShoppingCart, FiSearch } from "react-icons/fi";
import { useBranding } from "../context/BrandingContext";
import { getCategories } from "../api/products";
import BrandLogo from "./BrandLogo";
import Footer from "./Footer";

function readGuestCart() {
  try { return JSON.parse(localStorage.getItem("s2h_guest_cart") || "{}"); } catch { return {}; }
}

export default function GuestLayout() {
  const { settings } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState(readGuestCart);

  useEffect(() => {
    getCategories()
      .then((r) => setCategories(r.data.categories || []))
      .catch(() => {});
  }, []);

  // Re-read the cart on every route change (covers normal navigation
  // between guest pages), and whenever a page explicitly signals a
  // change via the "s2h-cart-updated" CustomEvent. localStorage's own
  // "storage" event only fires in OTHER tabs, never the tab that made
  // the change, so it can't be relied on alone to keep this header's
  // badge in sync with same-tab cart edits.
  useEffect(() => {
    setCart(readGuestCart());
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setCart(readGuestCart());
    window.addEventListener("s2h-cart-updated", handler);
    return () => window.removeEventListener("s2h-cart-updated", handler);
  }, []);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo size="md" />
            <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">
              {settings.site_name}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/shop"
              className="text-gray-400 hover:text-gray-700 transition-colors p-2"
              aria-label="Search products">
              <FiSearch size={18} />
            </Link>
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
              </button>
            )}
          </div>
        </div>

        {/* Category nav — persistent across every guest page, not
            just the shop grid, per the "header throughout the
            customer portal" requirement. */}
        {categories.length > 0 && (
          <div className="border-t border-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex gap-5 overflow-x-auto">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/shop?category=${encodeURIComponent(c.name)}`}
                  className="flex-shrink-0 text-sm font-medium text-gray-600 hover:text-brand-600
                             transition-colors whitespace-nowrap">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}