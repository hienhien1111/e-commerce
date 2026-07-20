export class InsufficientStockException extends Error {
  constructor() {
    super('Insufficient product stock');
    this.name = InsufficientStockException.name;
  }
}
