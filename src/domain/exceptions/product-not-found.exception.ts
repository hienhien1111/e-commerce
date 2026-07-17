export class ProductNotFoundException extends Error {
  constructor(id: string) {
    super(`Product ${id} was not found`);
    this.name = ProductNotFoundException.name;
  }
}
