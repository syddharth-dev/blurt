import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JWTPayload } from 'jose';
import { JwtVerifier } from './jwt-verifier.js';
import { IS_PUBLIC } from './public.decorator.js';

export type AuthUser = { id: string; claims: JWTPayload };
export type AuthedRequest = Request & { user?: AuthUser };

/**
 * Global guard: every route needs `Authorization: Bearer <supabase-jwt>` unless @Public().
 * Role checks (RolesGuard) and ownership checks (services) come after this.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Sign in to continue.');
    if (!this.verifier.configured)
      throw new UnauthorizedException('Authentication is not configured.');

    try {
      const claims = await this.verifier.verify(token);
      if (!claims.sub) throw new Error('Token has no subject');
      req.user = { id: claims.sub, claims };
      return true;
    } catch {
      throw new UnauthorizedException('Your session has expired. Sign in again.');
    }
  }
}
