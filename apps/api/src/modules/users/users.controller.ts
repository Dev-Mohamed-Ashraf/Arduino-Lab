import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  cuidSchema,
  listUsersQuerySchema,
  updateProfileSchema,
  updateUserRoleSchema,
  type ListUsersQuery,
  type UpdateProfileInput,
  type UpdateUserRoleInput,
} from '@arduino-lab/contracts';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { zodBody, zodQuery, ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all users' })
  list(@Query(zodQuery(listUsersQuerySchema)) query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Change a user role' })
  updateRole(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ZodValidationPipe(cuidSchema)) id: string,
    @Body(zodBody(updateUserRoleSchema)) input: UpdateUserRoleInput,
  ) {
    return this.users.updateRole(actor.id, id, input.role);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update your own profile' })
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body(zodBody(updateProfileSchema)) input: UpdateProfileInput,
  ) {
    return this.users.updateProfile(user.id, input);
  }
}
