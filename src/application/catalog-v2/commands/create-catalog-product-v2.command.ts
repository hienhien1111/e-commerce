import type { CreateCatalogProductInput } from '@/application/catalog-v2/types/catalog-v2.types';

export class CreateCatalogProductV2Command {
  constructor(public readonly input: CreateCatalogProductInput) {}
}
