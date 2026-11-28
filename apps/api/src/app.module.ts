import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule } from './common/config/config.module.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { ContentModule } from './content/content.module.js';
import { GameplayModule } from './gameplay/gameplay.module.js';
import { HealthModule } from './health/health.module.js';
import { ProgressModule } from './progress/progress.module.js';
import { UsersModule } from './users/users.module.js';

/**
 * Root module of the modular monolith (docs/ARCHITECTURE.md → "API folder structure").
 * Still to come: leaderboard (Phase 5); teacher, media, classes (Phase 4).
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    // Default rate limit per client; answer checking has its own, tighter limit.
    // In memory for now; moves to Redis with leagues (Phase 5).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    AuthModule,
    HealthModule,
    UsersModule,
    ContentModule,
    ProgressModule,
    GameplayModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
  ],
})
export class AppModule {}
