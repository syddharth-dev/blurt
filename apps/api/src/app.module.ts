import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule } from './common/config/config.module.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';

/**
 * Root module of the modular monolith (docs/ARCHITECTURE.md → "API folder structure").
 * Feature modules (content, gameplay, progress, leaderboard, teacher, media, classes, admin)
 * are added here as each roadmap phase builds them.
 */
@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, HealthModule],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
