import {
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
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCategoryCommand } from '@/application/catalog/commands/create-category';
import { UpdateCategoryCommand } from '@/application/catalog/commands/update-category';
import { DeleteCategoryCommand } from '@/application/catalog/commands/delete-category';
import { GetCategoryQuery } from '@/application/catalog/queries/get-category';
import { GetCategoriesQuery } from '@/application/catalog/queries/get-categories';
import { CheckPermissions } from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';
import { CategoryDto } from '@/presentation/http/dtos/category.dto';
import { CreateCategoryDto } from '@/presentation/http/dtos/create-category.dto';
import { UpdateCategoryDto } from '@/presentation/http/dtos/update-category.dto';
import { QueryCategoryDto } from '@/presentation/http/dtos/query-category.dto';

@ApiTags('Catalog categories')
@Controller({ path: 'categories', version: '1' })
export class CategoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOkResponse({ type: CategoryDto, isArray: true })
  findAll(@Query() query: QueryCategoryDto) {
    return this.queryBus.execute(new GetCategoriesQuery(query.parentId));
  }

  @Get(':id')
  @ApiOkResponse({ type: CategoryDto })
  findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetCategoryQuery(id));
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.CREATE,
    subject: PermissionSubjectEnum.CATEGORY,
  })
  @ApiCookieAuth('access_token')
  @ApiCreatedResponse({ type: CategoryDto })
  create(@Body() body: CreateCategoryDto) {
    return this.commandBus.execute(new CreateCategoryCommand(body));
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.CATEGORY,
  })
  @ApiCookieAuth('access_token')
  @ApiOkResponse({ type: CategoryDto })
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.commandBus.execute(new UpdateCategoryCommand(id, body));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @CheckPermissions({
    action: PermissionActionEnum.DELETE,
    subject: PermissionSubjectEnum.CATEGORY,
  })
  @ApiCookieAuth('access_token')
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.commandBus.execute(new DeleteCategoryCommand(id));
  }
}
