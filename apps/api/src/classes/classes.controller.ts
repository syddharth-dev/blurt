import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AssignTopics, CreateClass, JoinClass, UpdateClass } from '@blurt/shared/schemas';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthUser } from '../auth/supabase-jwt.guard.js';
import { ClassesService } from './classes.service.js';

/** Teachers' classes (DATA_AND_API.md → Teacher). Ownership is checked in ClassesService. */
@Controller('teacher/classes')
@Roles('TEACHER')
export class TeacherClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.classes.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body({ schema: CreateClass }) body: CreateClass) {
    return this.classes.create(user, body.name);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classes.detail(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: UpdateClass }) body: UpdateClass,
  ) {
    return this.classes.update(user, id, body);
  }

  @Put(':id/topics')
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body({ schema: AssignTopics }) body: AssignTopics,
  ) {
    return this.classes.assign(user, id, body);
  }

  @Delete(':id/students/:studentId')
  removeStudent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classes.removeStudent(user, id, studentId);
  }
}

/** Students (DATA_AND_API.md → Student): join with a code, see their classes. */
@Controller('classes')
export class StudentClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.classes.mine(user);
  }

  /** Tightly limited so codes can't be guessed. */
  @Post('join')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  join(@CurrentUser() user: AuthUser, @Body({ schema: JoinClass }) body: JoinClass) {
    return this.classes.join(user, body.code);
  }
}
