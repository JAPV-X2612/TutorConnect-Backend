import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TutorsModule } from './modules/tutors/tutors.module';
import { SearchModule } from './modules/search/search.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { HealthModule } from './modules/health/health.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MessagingModule } from './modules/messaging/messaging.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    TutorsModule,
    SearchModule,
    BookingsModule,
    WebhooksModule,
    DashboardModule,
    MessagingModule,
  ],
  providers: [AppService],
})
export class AppModule {}
