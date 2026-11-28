import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module.js';
import { ReportsController } from './reports.controller.js';
import { PrismaReportsRepository, ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [ClassesModule],
  controllers: [ReportsController],
  providers: [ReportsService, { provide: ReportsRepository, useClass: PrismaReportsRepository }],
})
export class ReportsModule {}
