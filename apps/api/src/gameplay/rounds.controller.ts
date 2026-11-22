import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AttemptRequest, FinishRound, SkipRequest, StartRound } from '@blurt/shared/schemas';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { RoundsService } from './rounds.service.js';

const RoundId = z.string().min(1).max(64);

/** Answer checking is rate-limited per client (ARCHITECTURE.md → Security and fairness). */
const ATTEMPT_LIMIT = { default: { limit: 40, ttl: 60_000 } };

@Controller('rounds')
export class RoundsController {
  constructor(private readonly rounds: RoundsService) {}

  @Post()
  start(@CurrentUser() user: AuthUser, @Body({ schema: StartRound }) body: StartRound) {
    return this.rounds.start(user, body);
  }

  @Post(':id/attempts')
  @HttpCode(200)
  @Throttle(ATTEMPT_LIMIT)
  attempt(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: RoundId }) id: string,
    @Body({ schema: AttemptRequest }) body: AttemptRequest,
  ) {
    return this.rounds.attempt(user, id, body);
  }

  @Post(':id/skip')
  @HttpCode(200)
  skip(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: RoundId }) id: string,
    @Body({ schema: SkipRequest }) body: SkipRequest,
  ) {
    return this.rounds.skip(user, id, body);
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: RoundId }) id: string,
    @Body({ schema: FinishRound }) body: FinishRound,
  ) {
    return this.rounds.finish(user, id, body.localDate);
  }
}
