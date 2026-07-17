import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductCommand } from '@/application/catalog/commands/create-product';
import { UpdateProductCommand } from '@/application/catalog/commands/update-product';
import { DeleteProductCommand } from '@/application/catalog/commands/delete-product';
import { UploadProductImageCommand } from '@/application/catalog/commands/upload-product-image';
import { DeleteProductImageCommand } from '@/application/catalog/commands/delete-product-image';
import { GetProductQuery } from '@/application/catalog/queries/get-product';
import { GetProductsQuery } from '@/application/catalog/queries/get-products';
import { CheckPermissions } from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import { CreateProductDto } from '@/presentation/http/dtos/create-product.dto';
import { UpdateProductDto } from '@/presentation/http/dtos/update-product.dto';
import { QueryProductDto } from '@/presentation/http/dtos/query-product.dto';
import { ProductDto } from '@/presentation/http/dtos/product.dto';
import { ProductImageDto } from '@/presentation/http/dtos/product-image.dto';
import { ProductPageDto } from '@/presentation/http/dtos/product-page.dto';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@ApiTags('Catalog products')
@Controller({ path: 'products', version: '1' })
export class ProductController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOkResponse({ type: ProductPageDto })
  findAll(@Query() query: QueryProductDto) {
    return this.queryBus.execute(
      new GetProductsQuery(
        {
          categoryId: query.categoryId,
          search: query.search || undefined,
          minPrice: query.minPrice,
          maxPrice: query.maxPrice,
        },
        query.cursor ?? null,
        query.limit ?? 20,
      ),
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: ProductDto })
  findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetProductQuery(id));
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.CREATE,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @ApiCookieAuth('access_token')
  @ApiCreatedResponse({ type: ProductDto })
  create(@Body() body: CreateProductDto) {
    return this.commandBus.execute(new CreateProductCommand(body));
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @ApiCookieAuth('access_token')
  @ApiOkResponse({ type: ProductDto })
  update(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.commandBus.execute(new UpdateProductCommand(id, body));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.DELETE,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @ApiCookieAuth('access_token')
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.commandBus.execute(new DeleteProductCommand(id));
  }

  @Post(':id/images')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) =>
        callback(null, IMAGE_MIME_TYPES.has(file.mimetype)),
    }),
  )
  @ApiCookieAuth('access_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: ProductImageDto })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file || !IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'A JPEG, PNG, or WebP image file is required',
      );
    }
    return this.commandBus.execute(
      new UploadProductImageCommand(id, file.buffer),
    );
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.PRODUCT,
  })
  @ApiCookieAuth('access_token')
  @ApiNoContentResponse()
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.commandBus.execute(new DeleteProductImageCommand(id, imageId));
  }
}
