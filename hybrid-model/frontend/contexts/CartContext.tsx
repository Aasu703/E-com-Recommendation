import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  product_id: string;
  name: string;
  price_npr: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: { product_id: string; name: string; price_npr: number }, quantity?: number) => void;
  removeFromCart: (product_id: string) => void;
  updateQuantity: (product_id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  total: 0,
});

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.user_id ?? null;
  const [items, setItems] = useState<CartItem[]>([]);

  // Cart is per-account: switching users (or logging out) swaps the whole cart.
  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    const stored = localStorage.getItem(`cart_items:${userId}`);
    setItems(stored ? JSON.parse(stored) : []);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(`cart_items:${userId}`, JSON.stringify(items));
  }, [userId, items]);

  const addToCart = (product: { product_id: string; name: string; price_npr: number }, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.product_id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...product, quantity }];
    });
  };

  const removeFromCart = (product_id: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== product_id));
  };

  const updateQuantity = (product_id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(product_id);
      return;
    }
    setItems((prev) => prev.map((i) => (i.product_id === product_id ? { ...i, quantity } : i)));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price_npr * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
