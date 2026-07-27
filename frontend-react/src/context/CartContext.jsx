import { createContext, useContext, useState, useEffect } from "react";

// Client-side only for now — there's no `carts` or `orders` table in
// the database yet (that's DeliveryHub proposal scope, not built here).
// This is real, working state (persisted across page loads via
// localStorage), not a placeholder — it just doesn't sync to a server.
// Swapping this for a real backend-backed cart later means changing
// this file only; components call useCart() and don't know the
// difference.
const CartContext = createContext(null);

const STORAGE_KEY = "s2h_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, quantity) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.product_id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.product_id,
          product_name: product.product_name,
          price: product.price,
          quantity,
        },
      ];
    });
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside a CartProvider");
  return ctx;
}
