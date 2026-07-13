import React, { createContext, useContext, useState } from 'react';

export interface PendingCartProduct {
  product_id: string;
  name: string;
  price_npr: number;
}

interface CartGateContextType {
  pending: PendingCartProduct | null;
  requestAdd: (product: PendingCartProduct) => void;
  clear: () => void;
}

const CartGateContext = createContext<CartGateContextType>({
  pending: null,
  requestAdd: () => {},
  clear: () => {},
});

export const CartGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingCartProduct | null>(null);

  return (
    <CartGateContext.Provider value={{ pending, requestAdd: setPending, clear: () => setPending(null) }}>
      {children}
    </CartGateContext.Provider>
  );
};

export const useCartGate = () => useContext(CartGateContext);
