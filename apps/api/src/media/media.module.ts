import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { PictureJobs } from './picture-jobs.js';
import { PictureStorage, SupabasePictureStorage } from './picture-storage.js';
import { PicturesController } from './pictures.controller.js';
import { PicturesRepository, PrismaPicturesRepository } from './pictures.repository.js';
import { PicturesService } from './pictures.service.js';

@Module({
  imports: [UsersModule],
  controllers: [PicturesController],
  providers: [
    PicturesService,
    PictureJobs,
    { provide: PictureStorage, useClass: SupabasePictureStorage },
    { provide: PicturesRepository, useClass: PrismaPicturesRepository },
  ],
})
export class MediaModule {}
