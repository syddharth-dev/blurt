import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { matchAnswer } from '@blurt/shared/matcher';
import {
  ConfusableSuggestionsRequest,
  CreateTerm,
  CreateTopic,
  MatchTestRequest,
  ReorderTerms,
  UpdateTerm,
  UpdateTopic,
} from '@blurt/shared/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { TeacherService } from './teacher.service.js';

/**
 * Teacher routes (DATA_AND_API.md → Teacher). @Roles lets teachers and admins in;
 * TeacherService checks that the topic is theirs (AGENTS.md rule 9).
 */
@Controller('teacher')
@Roles('TEACHER')
export class TeacherController {
  constructor(private readonly teacher: TeacherService) {}

  @Get('subjects')
  subjects() {
    return this.teacher.subjects();
  }

  @Get('topics')
  topics(@CurrentUser() user: AuthUser) {
    return this.teacher.listTopics(user);
  }

  /** Published starter-library topics a teacher can copy. */
  @Get('library')
  library() {
    return this.teacher.library();
  }

  @Post('topics')
  createTopic(@CurrentUser() user: AuthUser, @Body({ schema: CreateTopic }) body: CreateTopic) {
    return this.teacher.createTopic(user, body);
  }

  @Get('topics/:id')
  topic(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.teacher.topic(user, id);
  }

  @Patch('topics/:id')
  updateTopic(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: UpdateTopic }) body: UpdateTopic,
  ) {
    return this.teacher.updateTopic(user, id, body);
  }

  /** Archives (topics are never hard-deleted: rounds and reports point at them). */
  @Delete('topics/:id')
  archiveTopic(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.teacher.archiveTopic(user, id);
  }

  @Post('topics/:id/duplicate')
  duplicateTopic(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.teacher.duplicateTopic(user, id);
  }

  @Post('topics/:id/publish')
  @HttpCode(200)
  publishTopic(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.teacher.publishTopic(user, id);
  }

  @Put('topics/:id/terms/order')
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: ReorderTerms }) body: ReorderTerms,
  ) {
    return this.teacher.reorderTerms(user, id, body.termIds);
  }

  @Post('topics/:id/terms')
  createTerm(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: CreateTerm }) body: CreateTerm,
  ) {
    return this.teacher.createTerm(user, id, body);
  }

  @Post('terms/confusable-suggestions')
  @HttpCode(200)
  confusableSuggestions(
    @CurrentUser() user: AuthUser,
    @Body({ schema: ConfusableSuggestionsRequest }) body: ConfusableSuggestionsRequest,
  ) {
    return this.teacher.confusableSuggestions(user, body);
  }

  /**
   * "Test with my voice": the same matcher students are checked with, on the editor's current
   * (maybe unsaved) term. It reads and stores nothing, so there is no owner to check.
   */
  @Post('match-test')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  matchTest(@Body({ schema: MatchTestRequest }) body: MatchTestRequest) {
    const { verdict, matched, feedback, strategy } = matchAnswer(
      MatchTestRequest.parse(body).term,
      body.alternatives,
      { inputMode: body.inputMode },
    );
    return { verdict, matched, feedback, strategy };
  }

  @Get('terms/:id')
  term(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.teacher.term(user, id);
  }

  @Patch('terms/:id')
  updateTerm(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: UpdateTerm }) body: UpdateTerm,
  ) {
    return this.teacher.updateTerm(user, id, body);
  }

  @Delete('terms/:id')
  @HttpCode(204)
  async deleteTerm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.teacher.deleteTerm(user, id);
  }
}
