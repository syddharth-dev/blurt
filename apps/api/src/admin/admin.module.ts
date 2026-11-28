import { Module } from '@nestjs/common';
import { AuthAdmin } from '../auth/auth-admin.js';
import { UsersModule } from '../users/users.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AdminController],
  providers: [AdminService, AuthAdmin],
})
export class AdminModule {}
