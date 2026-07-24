import type { UpdateCatalogProductInput } from '@/application/catalog-v2/types/catalog-v2.types';

export class UpdateCatalogProductV2Command {
  constructor(
    public readonly id: string,
    public readonly input: UpdateCatalogProductInput,
  ) {}
}
