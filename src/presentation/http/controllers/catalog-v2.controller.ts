import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCatalogProductV2Command } from '@/application/catalog-v2/commands/create-catalog-product-v2.command';
import { UpdateCatalogProductV2Command } from '@/application/catalog-v2/commands/update-catalog-product-v2.command';
import { AdjustInventoryCommand } from '@/application/catalog-v2/commands/adjust-inventory.command';
import { GetCatalogProductV2Query } from '@/application/catalog-v2/queries/get-catalog-product-v2.query';
import { GetCatalogProductsV2Query } from '@/application/catalog-v2/queries/get-catalog-products-v2.query';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import { CheckPermissions } from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import {
  AdjustInventoryV2Dto,
  CreateCatalogProductV2Dto,
  QueryCatalogV2Dto,
  UpdateCatalogProductV2Dto,
} from '@/presentation/http/dtos/catalog-v2.dto';

@ApiTags('Catalog v2')
@Controller({ path: 'products', version: '2' })
export class CatalogV2Controller {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Projection-backed public catalog page.' })
  products(@Query() query: QueryCatalogV2Dto) {
    return this.queries.execute(
      new GetCatalogProductsV2Query(
        {
          categoryId: query.categoryId,
          search: query.search || undefined,
          minPrice: query.minPrice,
          maxPrice: query.maxPrice,
          optionValueIds: query.optionValueIds,
          inStock: query.inStock,
        },
        query.cursor ?? null,
        query.limit ?? 20,
      ),
    );
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Product topology, options and sellable variants.',
  })
  product(@Param('id') id: string) {
    return this.queries.execute(new GetCatalogProductV2Query(id));
  }
}

@ApiTags('Admin Catalog v2')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'admin/products', version: '2' })
export class AdminCatalogV2Controller {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get(':id')
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @ApiOkResponse({
    description: 'Admin product topology including archived variants.',
  })
  product(@Param('id') id: string) {
    return this.queries.execute(new GetCatalogProductV2Query(id, true));
  }

  @Post()
  @CheckPermissions({
    action: PermissionActionEnum.CREATE,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @ApiCreatedResponse({
    description:
      'Creates product metadata, options, variants, media and opening inventory.',
  })
  create(@Body() body: CreateCatalogProductV2Dto) {
    return this.commands.execute(new CreateCatalogProductV2Command(body));
  }

  @Patch(':id')
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @ApiOkResponse({
    description:
      'Updates Catalog v2 product. Topology changes require the complete variants array.',
  })
  update(@Param('id') id: string, @Body() body: UpdateCatalogProductV2Dto) {
    return this.commands.execute(new UpdateCatalogProductV2Command(id, body));
  }

  @Post('variants/:variantId/inventory-adjustments')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @ApiOkResponse({
    description: 'Writes an immutable inventory adjustment movement.',
  })
  adjustInventory(
    @Param('variantId') variantId: string,
    @Body() body: AdjustInventoryV2Dto,
  ) {
    return this.commands.execute(
      new AdjustInventoryCommand({ ...body, variantId }),
    );
  }
}
