import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PictureUploadRequest, UpdatePicture } from '@blurt/shared/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { PicturesService } from './pictures.service.js';

/** DATA_AND_API.md → Teacher: pictures. Ownership is checked in PicturesService. */
@Controller('teacher/pictures')
@Roles('TEACHER')
export class PicturesController {
  constructor(private readonly pictures: PicturesService) {}

  @Post('upload-url')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  uploadUrl(
    @CurrentUser() user: AuthUser,
    @Body({ schema: PictureUploadRequest }) body: PictureUploadRequest,
  ) {
    return this.pictures.uploadUrl(user, body);
  }

  @Post(':id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pictures.complete(user, id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pictures.get(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: UpdatePicture }) body: UpdatePicture,
  ) {
    return this.pictures.update(user, id, body);
  }
}
