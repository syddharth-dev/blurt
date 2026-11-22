import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthedRequest, AuthUser } from './supabase-jwt.guard.js';

/** The signed-in user from the verified Supabase JWT. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!user) throw new Error('CurrentUser used on a public route');
  return user;
});
