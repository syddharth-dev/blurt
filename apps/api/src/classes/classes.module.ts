import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module.js';
import { ContentRepository } from '../content/content.repository.js';
import { UsersModule } from '../users/users.module.js';
import { UsersService } from '../users/users.service.js';
import { StudentClassesController, TeacherClassesController } from './classes.controller.js';
import { ClassesRepository, PrismaClassesRepository } from './classes.repository.js';
import { ClassesService } from './classes.service.js';

@Module({
  imports: [UsersModule, ContentModule],
  controllers: [TeacherClassesController, StudentClassesController],
  providers: [
    {
      // A factory: the constructor's last argument (the code maker) is for tests only.
      provide: ClassesService,
      useFactory: (r: ClassesRepository, c: ContentRepository, u: UsersService) =>
        new ClassesService(r, c, u),
      inject: [ClassesRepository, ContentRepository, UsersService],
    },
    { provide: ClassesRepository, useClass: PrismaClassesRepository },
  ],
  exports: [ClassesService, ClassesRepository],
})
export class ClassesModule {}
