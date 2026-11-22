import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { ContentController } from './content.controller.js';
import { ContentRepository, PrismaContentRepository } from './content.repository.js';
import { ContentService } from './content.service.js';

@Module({
  imports: [UsersModule],
  controllers: [ContentController],
  providers: [ContentService, { provide: ContentRepository, useClass: PrismaContentRepository }],
})
export class ContentModule {}
