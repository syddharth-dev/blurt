import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module.js';
import { UsersModule } from '../users/users.module.js';
import { RoundsController } from './rounds.controller.js';
import { PrismaRoundsRepository, RoundsRepository } from './rounds.repository.js';
import { RoundsService } from './rounds.service.js';

@Module({
  imports: [UsersModule, ProgressModule],
  controllers: [RoundsController],
  providers: [RoundsService, { provide: RoundsRepository, useClass: PrismaRoundsRepository }],
})
export class GameplayModule {}
