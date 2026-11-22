import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { ENV } from '../common/config/config.module.js';
import type { Env } from '../common/config/env.js';

/**
 * Verifies Supabase access tokens against the project's JWKS (ES256 keys).
 * A separate provider so tests can swap in a fake.
 */
@Injectable()
export class JwtVerifier {
  private readonly jwks?: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer?: string;

  constructor(@Inject(ENV) env: Env) {
    if (env.SUPABASE_URL) {
      this.issuer = new URL('/auth/v1', env.SUPABASE_URL).toString();
      this.jwks = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL));
    }
  }

  get configured(): boolean {
    return !!this.jwks;
  }

  /** The token's claims; throws if it isn't valid for this project. */
  async verify(token: string): Promise<JWTPayload> {
    if (!this.jwks) throw new Error('Authentication is not configured');
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: 'authenticated',
    });
    return payload;
  }
}
