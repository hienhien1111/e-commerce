import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CatalogV2RepositoryPort } from '@/application/catalog-v2/ports/catalog-v2.repository.port';
import { CATALOG_V2_REPOSITORY_PORT } from '@/application/catalog-v2/ports/catalog-v2.repository.port.token';
import { AdjustInventoryCommand } from './adjust-inventory.command';

@CommandHandler(AdjustInventoryCommand)
export class AdjustInventoryHandler
  implements ICommandHandler<AdjustInventoryCommand>
{
  constructor(
    @Inject(CATALOG_V2_REPOSITORY_PORT)
    private readonly repository: CatalogV2RepositoryPort,
  ) {}

  execute(command: AdjustInventoryCommand) {
    return this.repository.adjustInventory(command.input);
  }
}
