import type { InventoryAdjustmentInput } from '@/application/catalog-v2/types/catalog-v2.types';

export class AdjustInventoryCommand {
  constructor(public readonly input: InventoryAdjustmentInput) {}
}
