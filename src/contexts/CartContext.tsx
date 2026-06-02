import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { syncCart, trackEvent } from "@/lib/analytics";

interface CartItem {
  id: string;
  cartItemId: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  size?: string | null;
  color?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("sollaris-cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          cartItemId: item.cartItemId || `${item.id}-${item.size || 'none'}-${item.color || 'none'}`
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("sollaris-cart", JSON.stringify(items));
    // Sincroniza estado do carrinho com analytics (debounced)
    const t = setTimeout(() => {
      syncCart(items).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity" | "cartItemId">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.size === item.size && i.color === item.color);
      if (existing) {
        return prev.map((i) => (i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      const cartItemId = `${item.id}-${item.size || 'none'}-${item.color || 'none'}`;
      return [...prev, { ...item, cartItemId, quantity: 1 }];
    });
    setIsOpen(true);
    trackEvent("add_to_cart", {
      productId: item.id,
      productName: item.name,
      metadata: { price: item.price, size: item.size, color: item.color },
    }).catch(() => {});
  };

  const removeItem = (cartItemId: string) => {
    const removed = items.find((i) => i.cartItemId === cartItemId);
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
    if (removed) {
      trackEvent("remove_from_cart", {
        productId: removed.id,
        productName: removed.name,
      }).catch(() => {});
    }
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(cartItemId);
    setItems((prev) => prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i)));
  };

  const clearCart = () => {
    setItems([]);
    trackEvent("clear_cart").catch(() => {});
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
