import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CatalogV2RepositoryPort } from '@/application/catalog-v2/ports/catalog-v2.repository.port';
import { CATALOG_V2_REPOSITORY_PORT } from '@/application/catalog-v2/ports/catalog-v2.repository.port.token';
import { CreateCatalogProductV2Command } from './create-catalog-product-v2.command';

@CommandHandler(CreateCatalogProductV2Command)
export class CreateCatalogProductV2Handler
  implements ICommandHandler<CreateCatalogProductV2Command>
{
  constructor(
    @Inject(CATALOG_V2_REPOSITORY_PORT)
    private readonly repository: CatalogV2RepositoryPort,
  ) {}

  execute(command: CreateCatalogProductV2Command) {
    return this.repository.create(command.input);
  }
}
