import { Controller, Delete, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(RolesGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('signature')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Mint a short-lived signature for a direct upload' })
  signature() {
    return this.uploads.createSignature();
  }

  @Delete(':publicId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an uploaded image' })
  remove(@Param('publicId') publicId: string) {
    return this.uploads.remove(decodeURIComponent(publicId));
  }
}
