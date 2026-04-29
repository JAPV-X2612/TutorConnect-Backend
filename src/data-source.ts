import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { BookingEntity } from './database/entities/booking.entity';
import { CertificacionEntity } from './database/entities/certificacion.entity';
import { TutorEntity } from './database/entities/tutor.entity';
import { UserEntity } from './modules/users/entities/user.entity';
import { LearnerPreferenceEntity } from './modules/users/entities/learner-preference.entity';
import { TutorTopicEntity } from './modules/tutors/entities/tutor-topic.entity';
import { TutorAvailabilityEntity } from './modules/tutors/entities/tutor-availability.entity';
import { TutorCertificationEntity } from './modules/tutors/entities/tutor-certification.entity';
import { TutorCourseEntity } from './modules/tutors/entities/tutor-course.entity';
import { ChatChannelEntity } from './modules/messaging/entities/chat-channel.entity';
import { MessageEntity } from './modules/messaging/entities/message.entity';
import { ReviewEntity } from './modules/reviews/entities/review.entity';
import { PaymentEntity } from './modules/payments/entities/payment.entity';

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    const value = line.slice(separatorIndex + 1).trim();
    process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '5432';
  const database = process.env.DATABASE_NAME || 'tutorconnect';
  const user = process.env.DATABASE_USER || 'postgres';
  const password = process.env.DATABASE_PASSWORD || 'postgres';

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export default new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
  entities: [
    UserEntity,
    LearnerPreferenceEntity,
    TutorEntity,
    CertificacionEntity,
    TutorCourseEntity,
    TutorTopicEntity,
    TutorAvailabilityEntity,
    TutorCertificationEntity,
    BookingEntity,
    ChatChannelEntity,
    MessageEntity,
    ReviewEntity,
    PaymentEntity,
  ],
  migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
