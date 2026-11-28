import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportRange } from '@blurt/shared/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { ReportsService } from './reports.service.js';

/** DATA_AND_API.md → Teacher: reports. `?range=7d|30d|all` (default 7d). */
@Controller('teacher')
@Roles('TEACHER')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.reports.overview(user);
  }

  @Get('classes/:id/report')
  classReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('range', { schema: ReportRange.default('7d') }) range: ReportRange,
  ) {
    return this.reports.classReport(user, id, range);
  }

  @Get('classes/:id/students/:studentId/report')
  studentReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Query('range', { schema: ReportRange.default('7d') }) range: ReportRange,
  ) {
    return this.reports.studentReport(user, id, studentId, range);
  }
}
