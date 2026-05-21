jest.mock('../../src/modules/firebase/firebase.service', () => ({ FirebaseService: class {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MessagingService } from '../../src/modules/messaging/services/messaging.service';
import { MessagingDBService } from '../../src/database/dbservices/messaging.dbservice';
import { UsersDBService } from '../../src/database/dbservices/users.dbservice';
import { TutorCourseEntity } from '../../src/modules/tutors/entities/tutor-course.entity';
import { FirebaseService } from '../../src/modules/firebase/firebase.service';
import { UserRole } from '../../src/common/enums/user-role.enum';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUser(role: UserRole, clerkId: string, id: number) {
  return { id, clerkId, role, firstName: 'Test', lastName: 'User' } as any;
}

function buildChannel(overrides = {}) {
  return {
    id: 1, isActive: true, expiresAt: null, createdAt: new Date(),
    tutor: buildUser(UserRole.TUTOR, 'tutor_1', 10),
    learner: buildUser(UserRole.LEARNER, 'learner_1', 20),
    course: null,
    messages: [],
    ...overrides,
  } as any;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('MessagingService', () => {
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
      saveMessage: jest.fn(),
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

  // ── getOrCreateChannel ────────────────────────────────────────────────────

  describe('getOrCreateChannel', () => {
    it('throws NotFoundException when caller does not exist', async () => {
      usersDB.repository.findOne.mockResolvedValue(null);
      await expect(service.getOrCreateChannel('ghost', 'tutor_1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when other user does not exist', async () => {
      usersDB.repository.findOne
        .mockResolvedValueOnce(buildUser(UserRole.LEARNER, 'learner_1', 20))
        .mockResolvedValueOnce(null);
      await expect(service.getOrCreateChannel('learner_1', 'ghost_tutor')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a new channel when none exists and no active booking', async () => {
      const learner = buildUser(UserRole.LEARNER, 'learner_1', 20);
      const tutor = buildUser(UserRole.TUTOR, 'tutor_1', 10);
      const newChannel = buildChannel();

      usersDB.repository.findOne
        .mockResolvedValueOnce(learner)
        .mockResolvedValueOnce(tutor);
      messagingDB.findChannelByParticipants.mockResolvedValue(null);
      messagingDB.createChannel.mockResolvedValue(newChannel);

      const result = await service.getOrCreateChannel('learner_1', 'tutor_1');

      expect(messagingDB.createChannel).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(1);
    });

    it('returns existing channel without creating a new one', async () => {
      const learner = buildUser(UserRole.LEARNER, 'learner_1', 20);
      const tutor = buildUser(UserRole.TUTOR, 'tutor_1', 10);
      const existing = buildChannel();

      usersDB.repository.findOne
        .mockResolvedValueOnce(learner)
        .mockResolvedValueOnce(tutor);
      messagingDB.findChannelByParticipants.mockResolvedValue(existing);

      const result = await service.getOrCreateChannel('learner_1', 'tutor_1');

      expect(messagingDB.createChannel).not.toHaveBeenCalled();
      expect(result.id).toBe(1);
    });
  });

  // ── listChannels ──────────────────────────────────────────────────────────

  describe('listChannels', () => {
    it('throws NotFoundException when user does not exist', async () => {
      usersDB.repository.findOne.mockResolvedValue(null);
      await expect(service.listChannels('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns empty array when user has no channels', async () => {
      usersDB.repository.findOne.mockResolvedValue(buildUser(UserRole.LEARNER, 'learner_1', 20));
      messagingDB.findChannelsByUser.mockResolvedValue([]);

      const result = await service.listChannels('learner_1');
      expect(result).toEqual([]);
    });
  });

  // ── getHistory ────────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('throws NotFoundException when channel does not exist', async () => {
      messagingDB.findChannelById.mockResolvedValue(null);
      await expect(service.getHistory(999, 'learner_1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns empty messages array when channel has no messages', async () => {
      const channel = buildChannel();
      messagingDB.findChannelById.mockResolvedValue(channel);
      messagingDB.findMessagesByChannel.mockResolvedValue([]);

      const result = await service.getHistory(1, 'learner_1');
      expect(result).toEqual([]);
    });
  });
});
