import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createComponentSchema,
  cuidSchema,
  listComponentsQuerySchema,
  updateComponentSchema,
  type CreateComponentInput,
  type ListComponentsQuery,
  type UpdateComponentInput,
} from '@arduino-lab/contracts';
import { z } from 'zod';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { zodBody, zodQuery, ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ComponentsService } from './components.service';

const bulkCreateSchema = z.object({
  items: z.array(createComponentSchema).min(1).max(500),
});

@ApiTags('components')
@Controller('components')
@UseGuards(RolesGuard)
export class ComponentsController {
  constructor(private readonly components: ComponentsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List components with availability' })
  list(@Query(zodQuery(listComponentsQuerySchema)) query: ListComponentsQuery) {
    return this.components.list(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Component detail' })
  findOne(@Param('id', new ZodValidationPipe(cuidSchema)) id: string) {
    return this.components.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a component to the inventory' })
  create(
    @CurrentUser() actor: RequestUser,
    @Body(zodBody(createComponentSchema)) input: CreateComponentInput,
  ) {
    return this.components.create(actor.id, input);
  }

  @Post('bulk')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import many components at once' })
  createMany(
    @CurrentUser() actor: RequestUser,
    @Body(zodBody(bulkCreateSchema)) input: { items: CreateComponentInput[] },
  ) {
    return this.components.createMany(actor.id, input.items);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a component or its stock level' })
  update(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ZodValidationPipe(cuidSchema)) id: string,
    @Body(zodBody(updateComponentSchema)) input: UpdateComponentInput,
  ) {
    return this.components.update(actor.id, id, input);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a component, or deactivate it if it has history' })
  remove(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ZodValidationPipe(cuidSchema)) id: string,
  ) {
    return this.components.remove(actor.id, id);
  }
}
