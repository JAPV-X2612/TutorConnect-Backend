import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ChatChannelEntity } from '../../modules/messaging/entities/chat-channel.entity';
import { MessageEntity } from '../../modules/messaging/entities/message.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { TutorCourseEntity } from '../../modules/tutors/entities/tutor-course.entity';
import { TutorEntity } from '../entities/tutor.entity';
import { BookingEntity } from '../entities/booking.entity';

/**
 * Data-access service for the messaging entities.
 *
 * All TypeORM interactions for {@link ChatChannelEntity}, {@link MessageEntity},
 * and the booking-lookup used to determine channel expiry are centralised here.
 * No other service may instantiate or query these entities directly.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class MessagingDBService {
  private readonly logger = new Logger(MessagingDBService.name);

  constructor(
    @InjectRepository(ChatChannelEntity)
    private readonly channelRepo: Repository<ChatChannelEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    @InjectRepository(TutorEntity)
    private readonly tutorRepo: Repository<TutorEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
  ) {}

  // ── Channel operations ────────────────────────────────────────────────────

  async createChannel(
    tutor: UserEntity,
    learner: UserEntity,
    course: TutorCourseEntity | null,
    expiresAt: Date | null,
  ): Promise<ChatChannelEntity> {
    const channel = this.channelRepo.create({
      tutor,
      learner,
      course,
      expiresAt,
      isActive: true,
    });
    return this.channelRepo.save(channel);
  }

  async saveChannel(channel: ChatChannelEntity): Promise<ChatChannelEntity> {
    return this.channelRepo.save(channel);
  }

  async findChannelById(id: number): Promise<ChatChannelEntity | null> {
    return this.channelRepo.findOne({
      where: { id },
      relations: ['tutor', 'learner', 'course'],
    });
  }

  async findChannelByParticipants(
    tutorId: number,
    learnerId: number,
    courseId?: string,
  ): Promise<ChatChannelEntity | null> {
    const qb = this.channelRepo
      .createQueryBuilder('ch')
      .leftJoinAndSelect('ch.tutor', 'tutor')
      .leftJoinAndSelect('ch.learner', 'learner')
      .leftJoinAndSelect('ch.course', 'course')
      .where('ch.tutor_id = :tutorId', { tutorId })
      .andWhere('ch.learner_id = :learnerId', { learnerId });

    if (courseId) {
      qb.andWhere('ch.course_id = :courseId', { courseId });
    } else {
      qb.andWhere('ch.course_id IS NULL');
    }

    return qb.getOne();
  }

  async findChannelsByUser(userId: number): Promise<ChatChannelEntity[]> {
    return this.channelRepo
      .createQueryBuilder('ch')
      .leftJoinAndSelect('ch.tutor', 'tutor')
      .leftJoinAndSelect('ch.learner', 'learner')
      .leftJoinAndSelect('ch.course', 'course')
      .leftJoinAndMapOne(
        'ch.lastMessage',
        MessageEntity,
        'msg',
        'msg.channel_id = ch.id AND msg.deleted_at IS NULL',
      )
      .where('(ch.tutor_id = :uid OR ch.learner_id = :uid)', { uid: userId })
      .andWhere('ch.deleted_at IS NULL')
      .orderBy('ch.updated_at', 'DESC')
      .getMany();
  }

  /**
   * Looks up the most recent active booking (pending or confirmed) between the
   * given tutor and learner using the legacy `bookings` table.
   * Used to determine whether a pre-booking channel should have its expiry cleared.
   */
  async findActiveBookingForParticipants(
    tutorClerkId: string,
    learnerClerkId: string,
  ): Promise<BookingEntity | null> {
    const tutorEntity = await this.tutorRepo.findOne({
      where: { clerkId: tutorClerkId },
    });
    if (!tutorEntity) return null;

    return this.bookingRepo.findOne({
      where: {
        tutor: { id: tutorEntity.id },
        student: { clerkId: learnerClerkId },
        status: In(['pending', 'confirmed']),
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Message operations ────────────────────────────────────────────────────

  async createMessage(
    channel: ChatChannelEntity,
    sender: UserEntity,
    content: string,
  ): Promise<MessageEntity> {
    const message = this.messageRepo.create({
      channel,
      sender,
      content,
      sentAt: new Date(),
    });
    return this.messageRepo.save(message);
  }

  async findMessagesByChannel(
    channelId: number,
    limit = 50,
    offset = 0,
  ): Promise<MessageEntity[]> {
    return this.messageRepo.find({
      where: { channel: { id: channelId } },
      relations: ['sender'],
      order: { sentAt: 'ASC' },
      take: limit,
      skip: offset,
    });
  }
}
