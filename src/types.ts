export interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  category?: string;
  stockStatus?: string;
  description?: string;
  isInSlider?: boolean;
  sliderOrder?: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export type DeliveryLocation = 'insideDhaka' | 'outsideDhaka';

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface AppState {
  cart: CartItem[];
  isCartOpen: boolean;
  isMobileMenuOpen: boolean;
  user: any | null;
  deliveryLocation: DeliveryLocation;
  logoUrl?: string;
  categories?: Category[];
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, amount: number) => void;
  clearCart: () => void;
  setIsCartOpen: (isOpen: boolean) => void;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  setUser: (user: any) => void;
  setDeliveryLocation: (location: DeliveryLocation) => void;
  setLogoUrl: (url: string) => void;
  setCategories: (categories: Category[]) => void;
}
