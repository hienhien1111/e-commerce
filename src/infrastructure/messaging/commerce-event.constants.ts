export const CommerceEventType = {
  ORDER_SUBMITTED: 'OrderSubmitted',
  ORDER_RESERVED: 'OrderReserved',
  ORDER_RESERVATION_FAILED: 'OrderReservationFailed',
  ORDER_RELEASE_REQUESTED: 'OrderReleaseRequested',
  ORDER_RELEASED: 'OrderReleased',
  CATALOG_PROJECTION_REFRESH_REQUESTED: 'CatalogProjectionRefreshRequested',
  REFUND_RECONCILIATION_REQUESTED: 'RefundReconciliationRequested',
} as const;

export type CommerceEventTypeValue =
  (typeof CommerceEventType)[keyof typeof CommerceEventType];

export type OrderSubmittedPayload = {
  orderId: string;
  cartId: string | null;
  cartItemIds: string[];
  couponId: string | null;
};

export type OrderReleaseRequestedPayload = {
  orderId: string;
  reason: string;
};

export type RefundRequestedPayload = {
  paymentId: string;
  orderId: string;
  reason: string;
};
