import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessagingDBService } from '../../../database/dbservices/messaging.dbservice';
import { UsersDBService } from '../../../database/dbservices/users.dbservice';
import { TutorCourseEntity } from '../../tutors/entities/tutor-course.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

const CHAT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CourseInfo {
  id: string;
  subject: string;
  price: number;
  duration: number;
  modalidad: string;
}

export interface BookingInfo {
  id: string;
  status: string;
  startTime: string;
}

export interface ChannelResponse {
  id: number;
  isActive: boolean;
  expiresAt: string | null;
  otherUser: {
    id: number;
    clerkId: string;
    firstName: string;
    lastName: string;
  };
  course: CourseInfo | null;
  booking: BookingInfo | null;
  lastMessage: { content: string; sentAt: Date; fromMe: boolean } | null;
  createdAt: Date;
}

export interface MessageResponse {
  id: number;
  content: string;
  sentAt: Date;
  fromMe: boolean;
  sender: { id: number; firstName: string; lastName: string };
}

/**
 * Business-logic service for MOD-MSG-005 (Messaging).
 *
 * Orchestrates channel creation (with course context and expiry), history
 * retrieval, and message persistence. All database access is delegated to
 * {@link MessagingDBService} and {@link UsersDBService}.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly messagingDB: MessagingDBService,
    private readonly usersDB: UsersDBService,
    @InjectRepository(TutorCourseEntity)
    private readonly courseRepo: Repository<TutorCourseEntity>,
  ) {}

  /**
   * Returns or creates the chat channel between two users.
   *
   * Expiry logic:
   * - No active booking → channel expires in 24 h (pre-booking contact).
   * - Active booking exists → no expiry (permanent channel).
   * - Existing pre-booking channel where a booking now exists → expiry cleared.
   */
  async getOrCreateChannel(
    callerClerkId: string,
    otherClerkId: string,
    courseId?: string,
  ): Promise<ChannelResponse> {
    const caller = await this.usersDB.repository.findOne({
      where: { clerkId: callerClerkId },
    });
    if (!caller) throw new NotFoundException('User not found');

    const other = await this.usersDB.repository.findOne({
      where: { clerkId: otherClerkId },
    });
    if (!other) throw new NotFoundException('Other user not found');

    const isTutor = (u: typeof caller) => u.role === UserRole.TUTOR;
    const [tutor, learner] = isTutor(caller)
      ? [caller, other]
      : [other, caller];

    const course = courseId
      ? await this.courseRepo.findOne({ where: { id: courseId } })
      : null;

    const activeBooking =
      await this.messagingDB.findActiveBookingForParticipants(
        tutor.clerkId,
        learner.clerkId,
      );
    const shouldExpire = !activeBooking;

    let channel = await this.messagingDB.findChannelByParticipants(
      tutor.id,
      learner.id,
    );

    if (!channel) {
      const expiresAt = shouldExpire
        ? new Date(Date.now() + CHAT_EXPIRY_MS)
        : null;
      channel = await this.messagingDB.createChannel(
        tutor,
        learner,
        course,
        expiresAt,
      );
      this.logger.log(
        `Channel ${channel.id} created tutor=${tutor.clerkId} learner=${learner.clerkId} expiresAt=${expiresAt}`,
      );
    } else if (channel.expiresAt && !shouldExpire) {
      // Booking confirmed since the pre-booking channel was opened — clear expiry.
      channel.expiresAt = null;
      channel = await this.messagingDB.saveChannel(channel);
    }

    const bookingInfo: BookingInfo | null = activeBooking
      ? {
          id: activeBooking.id,
          status: activeBooking.status,
          startTime: activeBooking.startTime.toISOString(),
        }
      : null;

    return this.formatChannel(channel, callerClerkId, bookingInfo);
  }

  async listChannels(callerClerkId: string): Promise<ChannelResponse[]> {
    const caller = await this.usersDB.repository.findOne({
      where: { clerkId: callerClerkId },
    });
    if (!caller) throw new NotFoundException('User not found');

    const channels = await this.messagingDB.findChannelsByUser(caller.id);

    return Promise.all(
      channels.map(async (ch) => {
        const booking = await this.messagingDB.findActiveBookingForParticipants(
          ch.tutor.clerkId,
          ch.learner.clerkId,
        );
        const bookingInfo: BookingInfo | null = booking
          ? {
              id: booking.id,
              status: booking.status,
              startTime: booking.startTime.toISOString(),
            }
          : null;
        return this.formatChannel(ch, callerClerkId, bookingInfo);
      }),
    );
  }

  async getHistory(
    channelId: number,
    callerClerkId: string,
    limit = 50,
    offset = 0,
  ): Promise<MessageResponse[]> {
    const channel = await this.messagingDB.findChannelById(channelId);
    if (!channel) throw new NotFoundException('Channel not found');
    this.assertParticipant(channel, callerClerkId);

    const messages = await this.messagingDB.findMessagesByChannel(
      channelId,
      limit,
      offset,
    );
    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      sentAt: m.sentAt,
      fromMe: m.sender.clerkId === callerClerkId,
      sender: {
        id: m.sender.id,
        firstName: m.sender.firstName,
        lastName: m.sender.lastName,
      },
    }));
  }

  async saveMessage(
    channelId: number,
    senderClerkId: string,
    content: string,
  ): Promise<MessageResponse> {
    const channel = await this.messagingDB.findChannelById(channelId);
    if (!channel) throw new NotFoundException('Channel not found');
    if (!channel.isActive)
      throw new ForbiddenException('This channel is no longer active');
    if (channel.expiresAt && channel.expiresAt < new Date()) {
      throw new ForbiddenException(
        'Este chat ha expirado. Reserva una sesión para continuar.',
      );
    }
    this.assertParticipant(channel, senderClerkId);

    const sender = await this.usersDB.repository.findOne({
      where: { clerkId: senderClerkId },
    });
    if (!sender) throw new NotFoundException('Sender not found');

    const message = await this.messagingDB.createMessage(
      channel,
      sender,
      content,
    );
    return {
      id: message.id,
      content: message.content,
      sentAt: message.sentAt,
      fromMe: true,
      sender: {
        id: sender.id,
        firstName: sender.firstName,
        lastName: sender.lastName,
      },
    };
  }

  /** Used by the gateway to validate channel access before joining a room. */
  async assertChannelAccess(channelId: number, clerkId: string): Promise<void> {
    const channel = await this.messagingDB.findChannelById(channelId);
    if (!channel) throw new NotFoundException('Channel not found');
    this.assertParticipant(channel, clerkId);
    if (!channel.isActive)
      throw new ForbiddenException('Este canal ya no está activo');
    if (channel.expiresAt && channel.expiresAt < new Date()) {
      throw new ForbiddenException(
        'Este chat ha expirado. Reserva una sesión para continuar.',
      );
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private assertParticipant(
    channel: Awaited<ReturnType<MessagingDBService['findChannelById']>>,
    clerkId: string,
  ) {
    if (!channel) throw new NotFoundException('Channel not found');
    if (
      channel.tutor.clerkId !== clerkId &&
      channel.learner.clerkId !== clerkId
    ) {
      throw new ForbiddenException('Access denied to this channel');
    }
  }

  private formatChannel(
    channel: NonNullable<
      Awaited<ReturnType<MessagingDBService['findChannelById']>>
    >,
    callerClerkId: string,
    bookingInfo: BookingInfo | null,
  ): ChannelResponse {
    const isCallerTutor = channel.tutor.clerkId === callerClerkId;
    const other = isCallerTutor ? channel.learner : channel.tutor;
    const lastMsg = (channel as any).lastMessage ?? null;

    return {
      id: channel.id,
      isActive: channel.isActive,
      expiresAt: channel.expiresAt?.toISOString() ?? null,
      otherUser: {
        id: other.id,
        clerkId: other.clerkId,
        firstName: other.firstName,
        lastName: other.lastName,
      },
      course: channel.course
        ? {
            id: channel.course.id,
            subject: channel.course.subject,
            price: channel.course.price,
            duration: channel.course.duration,
            modalidad: channel.course.modalidad,
          }
        : null,
      booking: bookingInfo,
      lastMessage: lastMsg
        ? {
            content: lastMsg.content,
            sentAt: lastMsg.sentAt,
            fromMe: lastMsg.sender?.clerkId === callerClerkId,
          }
        : null,
      createdAt: channel.createdAt,
    };
  }
}
