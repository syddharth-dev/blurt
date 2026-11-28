import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import {
  PrismaTeacherContentRepository,
  TeacherContentRepository,
} from './teacher-content.repository.js';
import { TeacherController } from './teacher.controller.js';
import { TeacherService } from './teacher.service.js';

@Module({
  imports: [UsersModule],
  controllers: [TeacherController],
  providers: [
    TeacherService,
    { provide: TeacherContentRepository, useClass: PrismaTeacherContentRepository },
  ],
})
export class TeacherModule {}
