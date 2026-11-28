import { Body, Controller, Get, Post } from '@nestjs/common';
import { InviteTeacher } from '@blurt/shared/schemas';
import { Roles } from '../auth/roles.decorator.js';
import { AdminService } from './admin.service.js';

@Controller('admin')
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /** Invite a teacher by email (or promote an existing account). */
  @Post('teachers/invite')
  invite(@Body({ schema: InviteTeacher }) body: InviteTeacher) {
    return this.admin.inviteTeacher(body);
  }

  /** Teachers and admins. */
  @Get('teachers')
  staff() {
    return this.admin.staff();
  }
}
