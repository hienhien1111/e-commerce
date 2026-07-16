import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateUserCommand } from '@/application/identity/commands/create-user';
import { UpdateUserCommand } from '@/application/identity/commands/update-user';
import { DeleteUserCommand } from '@/application/identity/commands/delete-user';
import { GetUserQuery } from '@/application/identity/queries/get-user';
import { GetUsersQuery } from '@/application/identity/queries/get-users';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiOperation,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { User } from '@/domain/entities/user';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '@/utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '@/utils/infinity-pagination';
import { QueryUserDto } from '../dtos/query-user.dto';
import { UserDto } from '../dtos/user.dto';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { CheckPermissions } from '@/infrastructure/decorators/check-permissions.decorator';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';

@ApiTags('Users')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @CheckPermissions({
    action: PermissionActionEnum.CREATE,
    subject: PermissionSubjectEnum.USER,
  })
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({
    type: UserDto,
    description: 'User created successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiUnprocessableEntityResponse({ description: 'Email already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.commandBus.execute(new CreateUserCommand(createUserDto));
  }

  @Get()
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.USER,
  })
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiOkResponse({
    type: InfinityPaginationResponse(UserDto),
    description: 'List of users',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAll(
    @Query() query: QueryUserDto,
  ): Promise<InfinityPaginationResponseDto<User>> {
    const limit = Math.min(query?.limit ?? 10, 50);

    const users = await this.queryBus.execute(
      new GetUsersQuery(query.filters, query.sort, {
        cursor: query.cursor ?? null,
        limit,
      }),
    );

    return infinityPagination(users, { cursor: query.cursor ?? null, limit });
  }

  @Get(':id')
  @CheckPermissions({
    action: PermissionActionEnum.READ,
    subject: PermissionSubjectEnum.USER,
  })
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'User UUID',
  })
  @ApiOkResponse({
    type: UserDto,
    description: 'User found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findById(@Param('id') id: string) {
    return this.queryBus.execute(new GetUserQuery(id));
  }

  @Patch(':id')
  @CheckPermissions({
    action: PermissionActionEnum.UPDATE,
    subject: PermissionSubjectEnum.USER,
  })
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'User UUID',
  })
  @ApiOkResponse({
    type: UserDto,
    description: 'User updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnprocessableEntityResponse({ description: 'Email already exists' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.commandBus.execute(new UpdateUserCommand(id, updateUserDto));
  }

  @Delete(':id')
  @CheckPermissions({
    action: PermissionActionEnum.DELETE,
    subject: PermissionSubjectEnum.USER,
  })
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'User UUID',
  })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.commandBus.execute(new DeleteUserCommand(id));
  }
}
