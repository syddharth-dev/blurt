import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { ContentService } from './content.service.js';

@Controller('subjects')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  subjects(@CurrentUser() user: AuthUser) {
    return this.content.subjects(user);
  }
}
