import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import cloudinaryConfig from '@/infrastructure/config/cloudinary.config';
import { PrismaModule } from '@/infrastructure/persistence/prisma/prisma.module';
import { CloudinaryProvider } from '@/infrastructure/providers/cloudinary.provider';
import { PrismaCategoryRepository } from '@/infrastructure/persistence/repositories/prisma-category.repository';
import { PrismaProductRepository } from '@/infrastructure/persistence/repositories/prisma-product.repository';
import { CategoryController } from '@/presentation/http/controllers/category.controller';
import { ProductController } from '@/presentation/http/controllers/product.controller';
import { CATEGORY_REPOSITORY_PORT } from '@/application/catalog/ports/category.repository.port.token';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import { FILE_STORAGE_PORT } from '@/application/shared/ports/file-storage/file-storage.port.token';
import { CategoryHierarchyService } from '@/application/catalog/services/category-hierarchy.service';
import { CreateCategoryHandler } from '@/application/catalog/commands/create-category';
import { UpdateCategoryHandler } from '@/application/catalog/commands/update-category';
import { DeleteCategoryHandler } from '@/application/catalog/commands/delete-category';
import { CreateProductHandler } from '@/application/catalog/commands/create-product';
import { UpdateProductHandler } from '@/application/catalog/commands/update-product';
import { DeleteProductHandler } from '@/application/catalog/commands/delete-product';
import { UploadProductImageHandler } from '@/application/catalog/commands/upload-product-image';
import { DeleteProductImageHandler } from '@/application/catalog/commands/delete-product-image';
import { CreateProductVariantHandler } from '@/application/catalog/commands/create-product-variant';
import { UpdateProductVariantHandler } from '@/application/catalog/commands/update-product-variant';
import { DeleteProductVariantHandler } from '@/application/catalog/commands/delete-product-variant';
import { GetCategoryHandler } from '@/application/catalog/queries/get-category';
import { GetCategoriesHandler } from '@/application/catalog/queries/get-categories';
import { GetProductHandler } from '@/application/catalog/queries/get-product';
import { GetProductsHandler } from '@/application/catalog/queries/get-products';
import { GetAdminProductsHandler } from '@/application/catalog/queries/get-admin-products';
import { GetAdminProductHandler } from '@/application/catalog/queries/get-admin-product';
import { GetAdminCategoriesHandler } from '@/application/catalog/queries/get-admin-categories';
import { AdminCatalogController } from '@/presentation/http/controllers/admin-catalog.controller';
import {
  AdminCatalogV2Controller,
  CatalogV2Controller,
} from '@/presentation/http/controllers/catalog-v2.controller';
import { PrismaCatalogV2Repository } from '@/infrastructure/persistence/repositories/prisma-catalog-v2.repository';
import { CATALOG_V2_REPOSITORY_PORT } from '@/application/catalog-v2/ports/catalog-v2.repository.port.token';
import { CreateCatalogProductV2Handler } from '@/application/catalog-v2/commands/create-catalog-product-v2.handler';
import { UpdateCatalogProductV2Handler } from '@/application/catalog-v2/commands/update-catalog-product-v2.handler';
import { AdjustInventoryHandler } from '@/application/catalog-v2/commands/adjust-inventory.handler';
import { GetCatalogProductV2Handler } from '@/application/catalog-v2/queries/get-catalog-product-v2.handler';
import { GetCatalogProductsV2Handler } from '@/application/catalog-v2/queries/get-catalog-products-v2.handler';

const CommandHandlers = [
  CreateCategoryHandler,
  UpdateCategoryHandler,
  DeleteCategoryHandler,
  CreateProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  UploadProductImageHandler,
  DeleteProductImageHandler,
  CreateProductVariantHandler,
  UpdateProductVariantHandler,
  DeleteProductVariantHandler,
  CreateCatalogProductV2Handler,
  UpdateCatalogProductV2Handler,
  AdjustInventoryHandler,
];

const QueryHandlers = [
  GetCategoryHandler,
  GetCategoriesHandler,
  GetProductHandler,
  GetProductsHandler,
  GetAdminProductsHandler,
  GetAdminProductHandler,
  GetAdminCategoriesHandler,
  GetCatalogProductV2Handler,
  GetCatalogProductsV2Handler,
];

@Module({
  imports: [
    CqrsModule,
    PrismaModule,
    ConfigModule.forFeature(cloudinaryConfig),
  ],
  controllers: [
    CategoryController,
    ProductController,
    AdminCatalogController,
    CatalogV2Controller,
    AdminCatalogV2Controller,
  ],
  providers: [
    CloudinaryProvider,
    PrismaCategoryRepository,
    PrismaProductRepository,
    PrismaCatalogV2Repository,
    CategoryHierarchyService,
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: CATEGORY_REPOSITORY_PORT,
      useExisting: PrismaCategoryRepository,
    },
    { provide: PRODUCT_REPOSITORY_PORT, useExisting: PrismaProductRepository },
    {
      provide: CATALOG_V2_REPOSITORY_PORT,
      useExisting: PrismaCatalogV2Repository,
    },
    { provide: FILE_STORAGE_PORT, useExisting: CloudinaryProvider },
  ],
})
export class CatalogModule {}
