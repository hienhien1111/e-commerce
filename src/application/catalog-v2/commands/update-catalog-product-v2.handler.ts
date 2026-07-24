import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CatalogV2RepositoryPort } from '@/application/catalog-v2/ports/catalog-v2.repository.port';
import { CATALOG_V2_REPOSITORY_PORT } from '@/application/catalog-v2/ports/catalog-v2.repository.port.token';
import { UpdateCatalogProductV2Command } from './update-catalog-product-v2.command';

@CommandHandler(UpdateCatalogProductV2Command)
export class UpdateCatalogProductV2Handler
  implements ICommandHandler<UpdateCatalogProductV2Command>
{
  constructor(
    @Inject(CATALOG_V2_REPOSITORY_PORT)
    private readonly repository: CatalogV2RepositoryPort,
  ) {}

  execute(command: UpdateCatalogProductV2Command) {
    return this.repository.update(command.id, command.input);
  }
}
