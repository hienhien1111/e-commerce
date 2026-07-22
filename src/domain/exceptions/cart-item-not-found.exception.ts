export class CartItemNotFoundException extends Error {
  constructor(productId: string) {
    super(`Cart item for product ${productId} was not found`);
    this.name = CartItemNotFoundException.name;
  }
}
