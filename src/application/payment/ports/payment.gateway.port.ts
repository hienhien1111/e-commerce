export type MomoOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
};

export type MomoInitiationInput = {
  providerOrderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  items: MomoOrderItem[];
  userInfo: { name: string; phoneNumber: string; email: string };
  deliveryInfo: {
    deliveryAddress: string;
    deliveryFee: string;
    quantity: string;
  };
  extraData: string;
  redirectUrl: string;
  ipnUrl: string;
};

export type MomoGatewaySession = {
  resultCode: number;
  message: string;
  payUrl: string | null;
  qrCodeUrl: string | null;
  deeplink: string | null;
};

export type MomoTransactionQueryResult = {
  resultCode: number;
  message: string;
  refundedAmount: number;
};

export type MomoRefundInput = {
  providerRefundOrderId: string;
  requestId: string;
  amount: number;
  providerTransId: string;
  description: string;
};

export type MomoRefundResult = {
  resultCode: number;
  message: string;
  refundTransId: string | null;
};

export type MomoWebhookPayload = {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: string;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
};

export interface PaymentGatewayPort {
  isConfigured(): boolean;
  initiate(input: MomoInitiationInput): Promise<MomoGatewaySession>;
  verifyWebhook(payload: MomoWebhookPayload): boolean;
  queryTransaction(input: {
    providerOrderId: string;
    requestId: string;
  }): Promise<MomoTransactionQueryResult>;
  refund(input: MomoRefundInput): Promise<MomoRefundResult>;
}
