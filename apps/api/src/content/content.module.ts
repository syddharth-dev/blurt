import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { ContentController, DailyController } from './content.controller.js';
import { ContentRepository, PrismaContentRepository } from './content.repository.js';
import { ContentService } from './content.service.js';

@Module({
  imports: [UsersModule],
  controllers: [ContentController, DailyController],
  providers: [ContentService, { provide: ContentRepository, useClass: PrismaContentRepository }],
  exports: [ContentRepository],
})
export class ContentModule {}
