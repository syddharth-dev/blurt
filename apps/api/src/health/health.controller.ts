import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@blurt/shared/schemas';
import { Public } from '../auth/public.decorator.js';

/** Railway's health check path (docs/DEPLOYMENT.md). Lives outside the /v1 prefix. */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): HealthResponse {
    return { ok: true };
  }
}
