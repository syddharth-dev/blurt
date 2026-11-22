import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

/**
 * The only place that constructs a Prisma client. Repositories inject this;
 * controllers never touch Prisma directly (docs/ARCHITECTURE.md).
 * Connects lazily on the first query, so the API boots without a database.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL ?? '' }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
