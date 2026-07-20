import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetAdminProductsQuery } from '@/application/catalog/queries/get-admin-products';
import { GetAdminCategoriesQuery } from '@/application/catalog/queries/get-admin-categories';
import { CheckPermissions } from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import { ProductPageDto } from '@/presentation/http/dtos/product-page.dto';
import { CategoryDto } from '@/presentation/http/dtos/category.dto';
import {
  QueryAdminCategoryDto,
  QueryAdminProductDto,
} from '@/presentation/http/dtos/query-admin-catalog.dto';

@ApiTags('Admin Catalog')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminCatalogController {
  constructor(private readonly queries: QueryBus) {}

  @Get('products')
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @ApiOkResponse({ type: ProductPageDto })
  products(@Query() query: QueryAdminProductDto) {
    return this.queries.execute(
      new GetAdminProductsQuery(
        {
          categoryId: query.categoryId,
          search: query.search || undefined,
          isActive: query.isActive,
        },
        query.cursor ?? null,
        query.limit ?? 20,
      ),
    );
  }

  @Get('categories')
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.CATEGORY,
  })
  @ApiOkResponse({ type: CategoryDto, isArray: true })
  categories(@Query() query: QueryAdminCategoryDto) {
    return this.queries.execute(
      new GetAdminCategoriesQuery({
        parentId: query.parentId,
        isActive: query.isActive,
      }),
    );
  }
}
