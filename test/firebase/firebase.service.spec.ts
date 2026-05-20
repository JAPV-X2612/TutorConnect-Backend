const mockSend = jest.fn();
const mockMessagingInstance = { send: mockSend };
const mockMessagingFn = jest.fn().mockReturnValue(mockMessagingInstance);
const mockInitializeApp = jest.fn();
const mockCert = jest.fn().mockReturnValue({});
let mockApps: any[] = [];

jest.mock('firebase-admin', () => ({
  get apps() { return mockApps; },
  initializeApp: (...args: any[]) => mockInitializeApp(...args),
  credential: { cert: (...args: any[]) => mockCert(...args) },
  messaging: () => mockMessagingFn(),
}));

import { FirebaseService } from '../../src/modules/firebase/firebase.service';

const ENV_VARS = {
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_PRIVATE_KEY: 'fake-private-key',
  FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
};

describe('FirebaseService', () => {
  let service: FirebaseService;

  function createService(): FirebaseService {
    return new FirebaseService();
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockApps = [];
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_CLIENT_EMAIL;
  });

  // ── onModuleInit ─────────────────────────────────────────────────────────────

  describe('onModuleInit', () => {
    it('should initialize Firebase when all credentials are present', () => {
      Object.assign(process.env, ENV_VARS);
      service = createService();

      service.onModuleInit();

      expect(mockInitializeApp).toHaveBeenCalledTimes(1);
      expect(mockMessagingFn).toHaveBeenCalledTimes(1);
    });

    it('should not call initializeApp when credentials are missing', () => {
      service = createService();

      service.onModuleInit();

      expect(mockInitializeApp).not.toHaveBeenCalled();
      expect(mockMessagingFn).not.toHaveBeenCalled();
    });

    it('should skip initializeApp when Firebase is already initialized', () => {
      Object.assign(process.env, ENV_VARS);
      mockApps = [{}]; // simulate already-initialized app
      service = createService();

      service.onModuleInit();

      expect(mockInitializeApp).not.toHaveBeenCalled();
      expect(mockMessagingFn).toHaveBeenCalledTimes(1);
    });

    it('should replace literal \\n escape sequences in private key with actual newlines', () => {
      Object.assign(process.env, {
        ...ENV_VARS,
        FIREBASE_PRIVATE_KEY: 'line1\\nline2\\nline3',
      });
      service = createService();

      service.onModuleInit();

      const certArg = mockCert.mock.calls[0][0];
      expect(certArg.privateKey).toBe('line1\nline2\nline3');
    });
  });

  // ── sendPush ─────────────────────────────────────────────────────────────────

  describe('sendPush', () => {
    beforeEach(() => {
      Object.assign(process.env, ENV_VARS);
      service = createService();
      service.onModuleInit();
    });

    it('should call messaging.send with the correct payload', async () => {
      mockSend.mockResolvedValue('message-id');

      await service.sendPush('device-token-abc', 'New booking', 'You have a session', { bookingId: '1' });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'device-token-abc',
          notification: { title: 'New booking', body: 'You have a session' },
          data: { bookingId: '1' },
        }),
      );
    });

    it('should swallow Firebase errors and not propagate them', async () => {
      mockSend.mockRejectedValue(new Error('FCM quota exceeded'));

      await expect(
        service.sendPush('device-token-abc', 'Title', 'Body'),
      ).resolves.toBeUndefined();
    });

    it('should default data to an empty object when not provided', async () => {
      mockSend.mockResolvedValue('message-id');

      await service.sendPush('token-xyz', 'Title', 'Body');

      const [payload] = mockSend.mock.calls[0];
      expect(payload.data).toEqual({});
    });

    it('should be a no-op and not call send when messaging is null', async () => {
      // Create service without initialising Firebase (no env vars)
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_PRIVATE_KEY;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      jest.clearAllMocks();
      mockApps = [];
      const uninitializedService = createService();
      uninitializedService.onModuleInit();

      await uninitializedService.sendPush('any-token', 'Title', 'Body');

      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
