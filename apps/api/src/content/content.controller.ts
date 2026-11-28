import { Controller, Get, Query } from '@nestjs/common';
import { LocalDate } from '@blurt/shared/schemas';
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

/** GET /daily?localDate=YYYY-MM-DD: today's challenge (the phone's date sets "today"). */
@Controller('daily')
export class DailyController {
  constructor(private readonly content: ContentService) {}

  @Get()
  daily(
    @CurrentUser() user: AuthUser,
    @Query('localDate', { schema: LocalDate }) localDate: string,
  ) {
    return this.content.daily(user, localDate);
  }
}
