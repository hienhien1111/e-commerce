export class PaymentNotFoundException extends Error {
  constructor() {
    super('Payment not found');
    this.name = 'PaymentNotFoundException';
  }
}
