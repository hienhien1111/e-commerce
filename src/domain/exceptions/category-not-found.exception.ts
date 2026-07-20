export class CategoryNotFoundException extends Error {
  constructor(id: string) {
    super(`Category ${id} was not found`);
    this.name = CategoryNotFoundException.name;
  }
}
