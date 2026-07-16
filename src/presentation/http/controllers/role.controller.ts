import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  SerializeOptions,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { GetRolesQuery } from '@/application/authorization/queries/get-roles';
import { GetRoleQuery } from '@/application/authorization/queries/get-role';
import { Role } from '@/domain/entities/role';
import { NullableType } from '@/utils/types/nullable.type';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Roles')
@ApiCookieAuth('access_token')
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'roles',
  version: '1',
})
export class RoleController {
  constructor(private readonly queryBus: QueryBus) {}

  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiOkResponse({
    type: Role,
    isArray: true,
    description: 'List of roles',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findAll(): Promise<Role[]> {
    return this.queryBus.execute(new GetRolesQuery());
  }

  @SerializeOptions({
    groups: ['admin'],
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Role UUID',
  })
  @ApiOkResponse({
    type: Role,
    description: 'Role found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  async findOne(@Param('id') id: string): Promise<NullableType<Role>> {
    return this.queryBus.execute(new GetRoleQuery(id));
  }
}
