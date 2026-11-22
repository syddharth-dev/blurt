import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateMe } from '@blurt/shared/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { UsersService } from './users.service.js';

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body({ schema: UpdateMe }) body: UpdateMe) {
    return this.users.update(user, body);
  }
}
