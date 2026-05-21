jest.mock('../../src/modules/firebase/firebase.service', () => ({ FirebaseService: class {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagingService } from '../../src/modules/messaging/services/messaging.service';
import { MessagingDBService } from '../../src/database/dbservices/messaging.dbservice';
import { UsersDBService } from '../../src/database/dbservices/users.dbservice';
import { TutorCourseEntity } from '../../src/modules/tutors/entities/tutor-course.entity';
import { FirebaseService } from '../../src/modules/firebase/firebase.service';
import { UserRole } from '../../src/common/enums/user-role.enum';

function buildUser(role: UserRole, clerkId: string, id: number) {
  return { id, clerkId, role, firstName: 'Test', lastName: 'User', fcmToken: null, notificationsEnabled: true } as any;
}

function buildChannel(overrides: Record<string, any> = {}) {
  return {
    id: 1, isActive: true, expiresAt: null, createdAt: new Date(),
    tutor: buildUser(UserRole.TUTOR, 'tutor_1', 10),
    learner: buildUser(UserRole.LEARNER, 'learner_1', 20),
    course: null,
    ...overrides,
  } as any;
}

function buildMessage() {
  return {
    id: 5, content: 'Hola!', sentAt: new Date(),
    sender: buildUser(UserRole.LEARNER, 'learner_1', 20),
  } as any;
}

describe('MessagingService — saveMessage & assertChannelAccess', () => {
  let service: MessagingService;
  let messagingDB: Record<string, jest.Mock>;
  let usersDB: { repository: Record<string, jest.Mock> };
  let courseRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    messagingDB = {
      findActiveBookingForParticipants: jest.fn().mockResolvedValue(null),
      findChannelByParticipants: jest.fn().mockResolvedValue(null),
      createChannel: jest.fn(),
      saveChannel: jest.fn(),
      findChannelsByUser: jest.fn().mockResolvedValue([]),
      findChannelById: jest.fn(),
      findMessagesByChannel: jest.fn().mockResolvedValue([]),
      createMessage: jest.fn(),
    };

    usersDB = { repository: { findOne: jest.fn() } };
    courseRepo = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: MessagingDBService, useValue: messagingDB },
        { provide: UsersDBService, useValue: usersDB },
        { provide: getRepositoryToken(TutorCourseEntity), useValue: courseRepo },
        { provide: FirebaseService, useValue: { sendPush: jest.fn() } },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── saveMessage ──────────────────────────────────────────────────────────────

  describe('saveMessage', () => {
    it('should save a message and return it with fromMe=true for the sender', async () => {
      const channel = buildChannel();
      const sender = buildUser(UserRole.LEARNER, 'learner_1', 20);
      const msg = buildMessage();

      messagingDB.findChannelById.mockResolvedValue(channel);
      usersDB.repository.findOne.mockResolvedValueOnce(sender);
      messagingDB.createMessage.mockResolvedValue(msg);

      const result = await service.saveMessage(1, 'learner_1', 'Hola!');

      expect(result.content).toBe('Hola!');
      expect(result.fromMe).toBe(true);
      expect(messagingDB.createMessage).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when channel does not exist', async () => {
      messagingDB.findChannelById.mockResolvedValue(null);
      await expect(service.saveMessage(999, 'learner_1', 'Hi')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when channel is inactive', async () => {
      messagingDB.findChannelById.mockResolvedValue(buildChannel({ isActive: false }));
      await expect(service.saveMessage(1, 'learner_1', 'Hi')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException when channel has expired', async () => {
      const expiredChannel = buildChannel({ expiresAt: new Date(Date.now() - 1000) });
      messagingDB.findChannelById.mockResolvedValue(expiredChannel);
      await expect(service.saveMessage(1, 'learner_1', 'Hi')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException when sender is not a channel participant', async () => {
      messagingDB.findChannelById.mockResolvedValue(buildChannel());
      await expect(service.saveMessage(1, 'outsider_clerk', 'Hi')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ── assertChannelAccess ──────────────────────────────────────────────────────

  describe('assertChannelAccess', () => {
    it('should resolve without error when caller is a valid participant', async () => {
      messagingDB.findChannelById.mockResolvedValue(buildChannel());
      await expect(service.assertChannelAccess(1, 'learner_1')).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when channel does not exist', async () => {
      messagingDB.findChannelById.mockResolvedValue(null);
      await expect(service.assertChannelAccess(999, 'learner_1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when channel is inactive', async () => {
      messagingDB.findChannelById.mockResolvedValue(buildChannel({ isActive: false }));
      await expect(service.assertChannelAccess(1, 'learner_1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException when channel has expired', async () => {
      messagingDB.findChannelById.mockResolvedValue(buildChannel({ expiresAt: new Date(Date.now() - 1000) }));
      await expect(service.assertChannelAccess(1, 'learner_1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw ForbiddenException when caller is not a participant', async () => {
      messagingDB.findChannelById.mockResolvedValue(buildChannel());
      await expect(service.assertChannelAccess(1, 'outsider_clerk')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ── getHistory edge cases ────────────────────────────────────────────────────

  describe('getHistory — additional cases', () => {
    it('should return messages with correct fromMe flag for the caller', async () => {
      const channel = buildChannel();
      const msg = buildMessage(); // sender is learner_1
      messagingDB.findChannelById.mockResolvedValue(channel);
      messagingDB.findMessagesByChannel.mockResolvedValue([msg]);

      const result = await service.getHistory(1, 'learner_1');

      expect(result[0].fromMe).toBe(true);
      expect(result[0].content).toBe('Hola!');
    });

    it('should throw ForbiddenException when caller is not a participant', async () => {
      messagingDB.findChannelById.mockResolvedValue(buildChannel());
      await expect(service.getHistory(1, 'outsider_clerk')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
