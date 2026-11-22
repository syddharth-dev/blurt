import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module.js';
import { JwtVerifier } from './jwt-verifier.js';
import { RolesGuard } from './roles.guard.js';
import { SupabaseJwtGuard } from './supabase-jwt.guard.js';

/** Global guards run in this order: verify the JWT, then check @Roles. */
@Module({
  imports: [UsersModule],
  providers: [
    JwtVerifier,
    { provide: APP_GUARD, useClass: SupabaseJwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
