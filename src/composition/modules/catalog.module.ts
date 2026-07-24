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
];

const QueryHandlers = [
  GetCategoryHandler,
  GetCategoriesHandler,
  GetProductHandler,
  GetProductsHandler,
  GetAdminProductsHandler,
  GetAdminProductHandler,
  GetAdminCategoriesHandler,
];

@Module({
  imports: [
    CqrsModule,
    PrismaModule,
    ConfigModule.forFeature(cloudinaryConfig),
  ],
  controllers: [CategoryController, ProductController, AdminCatalogController],
  providers: [
    CloudinaryProvider,
    PrismaCategoryRepository,
    PrismaProductRepository,
    CategoryHierarchyService,
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: CATEGORY_REPOSITORY_PORT,
      useExisting: PrismaCategoryRepository,
    },
    { provide: PRODUCT_REPOSITORY_PORT, useExisting: PrismaProductRepository },
    { provide: FILE_STORAGE_PORT, useExisting: CloudinaryProvider },
  ],
})
export class CatalogModule {}
