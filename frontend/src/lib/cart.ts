export type CartAvailabilityReason =
  | 'DELETED'
  | 'INACTIVE'
  | 'OUT_OF_STOCK'
  | 'INSUFFICIENT_STOCK';

export type CartProduct = {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  label: string | null;
  sku: string;
  price: number;
  stock: number;
  thumbnailUrl: string | null;
  isAvailable: boolean;
  availabilityReason: CartAvailabilityReason | null;
};

export type CartItem = {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  product: CartProduct;
  isAvailable: boolean;
  availabilityReason: CartAvailabilityReason | null;
};

export type AppliedCoupon = {
  id: string;
  code: string;
  isValid: boolean;
  reason?: string;
  discountAmount: number;
};

export type Cart = {
  id: string | null;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  checkoutReady: boolean;
  coupon: AppliedCoupon | null;
};

export const emptyCart = (): Cart => ({
  id: null,
  items: [],
  itemCount: 0,
  subtotal: 0,
  discountAmount: 0,
  total: 0,
  checkoutReady: false,
  coupon: null,
});

export const availabilityMessage: Record<CartAvailabilityReason, string> = {
  DELETED: 'Sản phẩm không còn tồn tại.',
  INACTIVE: 'Sản phẩm đã ngừng bán.',
  OUT_OF_STOCK: 'Sản phẩm đã hết hàng.',
  INSUFFICIENT_STOCK: 'Số lượng trong giỏ vượt tồn kho hiện tại.',
};

export const couponReasonMessage: Record<string, string> = {
  NOT_FOUND: 'Mã giảm giá không tồn tại.',
  INACTIVE: 'Mã giảm giá đã bị tắt.',
  EXPIRED: 'Mã giảm giá đã hết hạn.',
  MAX_USAGE_REACHED: 'Mã giảm giá đã hết lượt sử dụng.',
  ORDER_BELOW_MINIMUM: 'Đơn hàng chưa đạt giá trị tối thiểu.',
};
