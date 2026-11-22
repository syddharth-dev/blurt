import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@blurt/shared/schemas';
import { UsersService } from '../users/users.service.js';
import { ROLES } from './roles.decorator.js';
import type { AuthedRequest } from './supabase-jwt.guard.js';

/**
 * Global guard after SupabaseJwtGuard: routes marked @Roles(...) need one of those roles
 * (from our database, never from the client). Ownership checks happen in services.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const auth = context.switchToHttp().getRequest<AuthedRequest>().user;
    if (!auth) return false;
    const user = await this.users.ensure(auth);
    if (user.role === 'ADMIN' || roles.includes(user.role)) return true;
    throw new ForbiddenException("You don't have access to this.");
  }
}
