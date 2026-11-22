import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { ENV } from '../common/config/config.module.js';
import type { Env } from '../common/config/env.js';
import { IS_PUBLIC } from './public.decorator.js';

export type AuthUser = { id: string; claims: JWTPayload };
export type AuthedRequest = Request & { user?: AuthUser };

/**
 * Global guard: verifies `Authorization: Bearer <supabase-jwt>` against the Supabase
 * project's JWKS. Role checks (RolesGuard) and ownership checks come later and run after this.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly jwks?: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer?: string;

  constructor(
    private readonly reflector: Reflector,
    @Inject(ENV) env: Env,
  ) {
    if (env.SUPABASE_URL) {
      this.issuer = new URL('/auth/v1', env.SUPABASE_URL).toString();
      this.jwks = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL));
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Sign in to continue.');
    if (!this.jwks) throw new UnauthorizedException('Authentication is not configured.');

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      });
      if (!payload.sub) throw new Error('Token has no subject');
      req.user = { id: payload.sub, claims: payload };
      return true;
    } catch {
      throw new UnauthorizedException('Your session has expired. Sign in again.');
    }
  }
}
