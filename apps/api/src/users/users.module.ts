import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { PrismaUsersRepository, UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, { provide: UsersRepository, useClass: PrismaUsersRepository }],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
