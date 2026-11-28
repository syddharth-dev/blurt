import { Inject, Injectable } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '../common/config/config.module.js';
import type { Env } from '../common/config/env.js';

/**
 * Supabase Auth admin actions (service-role key: server only, never in the app or dashboard).
 * A separate provider so tests can swap in a fake.
 */
@Injectable()
export class AuthAdmin {
  private readonly client: SupabaseClient | null;
  private readonly redirectTo: string;

  constructor(@Inject(ENV) env: Env) {
    this.redirectTo = env.DASHBOARD_URL;
    this.client =
      env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : null;
  }

  private get admin() {
    if (!this.client)
      throw new Error('Supabase admin is not configured (SUPABASE_SERVICE_ROLE_KEY).');
    return this.client.auth.admin;
  }

  /** Creates the account and sends Supabase's "Invite user" email. Returns the new user's id. */
  async invite(email: string): Promise<{ id: string }> {
    const { data, error } = await this.admin.inviteUserByEmail(email, {
      redirectTo: this.redirectTo,
    });
    if (error || !data.user)
      throw new AuthAdminError(error?.code ?? 'invite_failed', error?.message ?? 'Invite failed');
    return { id: data.user.id };
  }

  /** Finds an existing Supabase account by email (accounts that never opened the app or dashboard). */
  async findIdByEmail(email: string): Promise<string | null> {
    const perPage = 200;
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await this.admin.listUsers({ page, perPage });
      if (error) throw new AuthAdminError(error.code ?? 'list_failed', error.message);
      const hit = data.users.find((u) => u.email?.toLowerCase() === email);
      if (hit) return hit.id;
      if (data.users.length < perPage) return null;
    }
    return null;
  }
}

export class AuthAdminError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
