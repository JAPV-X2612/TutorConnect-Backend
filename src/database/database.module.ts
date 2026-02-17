import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Module({
  imports: [], // Add TypeOrmModule/Prisma later
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}

