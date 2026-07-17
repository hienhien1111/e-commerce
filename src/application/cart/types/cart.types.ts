export type CartProductSnapshot = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isActive: boolean;
  deletedAt: Date | null;
  thumbnailUrl: string | null;
};

export type CartAvailabilityReason =
  | 'DELETED'
  | 'INACTIVE'
  | 'OUT_OF_STOCK'
  | 'INSUFFICIENT_STOCK';

export type CartView = {
  id: string | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    product: CartProductSnapshot;
    isAvailable: boolean;
    availabilityReason: CartAvailabilityReason | null;
  }>;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  checkoutReady: boolean;
  coupon: {
    id: string;
    code: string;
    isValid: boolean;
    reason?: string;
    discountAmount: number;
  } | null;
};
