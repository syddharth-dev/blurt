import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { loadEnv } from '../common/config/env.js';
import { JwtVerifier } from './jwt-verifier.js';
import { SupabaseJwtGuard } from './supabase-jwt.guard.js';

function contextWith(headers: Record<string, string>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('SupabaseJwtGuard', () => {
  const env = loadEnv({ SUPABASE_URL: 'https://example.supabase.co' });

  it('lets @Public() routes through without a token', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(true) } as unknown as Reflector;
    await expect(
      new SupabaseJwtGuard(reflector, new JwtVerifier(env)).canActivate(contextWith({})),
    ).resolves.toBe(true);
  });

  it('rejects a request with no bearer token', async () => {
    const guard = new SupabaseJwtGuard(new Reflector(), new JwtVerifier(env));
    await expect(guard.canActivate(contextWith({}))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a malformed token', async () => {
    const guard = new SupabaseJwtGuard(new Reflector(), new JwtVerifier(env));
    await expect(
      guard.canActivate(contextWith({ authorization: 'Bearer not.a.jwt' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects everything when Supabase is not configured', async () => {
    const guard = new SupabaseJwtGuard(new Reflector(), new JwtVerifier(loadEnv({})));
    await expect(
      guard.canActivate(contextWith({ authorization: 'Bearer abc' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
