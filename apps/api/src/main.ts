import 'dotenv/config';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ENV } from './common/config/config.module.js';
import type { Env } from './common/config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = app.get<Env>(ENV);

  app.setGlobalPrefix('v1', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.enableCors({ origin: env.CORS_ORIGINS });
  app.enableShutdownHooks();

  await app.listen(env.PORT);
}
await bootstrap();
