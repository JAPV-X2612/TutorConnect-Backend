import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Global Firebase Cloud Messaging service.
 *
 * Wraps the firebase-admin SDK to send push notifications to registered devices.
 * All sends are fire-and-forget — errors are logged but never propagated to callers.
 *
 * If Firebase credentials are missing from environment variables, the service
 * initialises in no-op mode and silently skips all sends.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.0
 * @since 2026-05-03
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: admin.messaging.Messaging | null = null;

  onModuleInit(): void {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn(
        'Firebase credentials not configured — push notifications disabled',
      );
      return;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          // JSON-encoded private keys use literal \n — restore actual newlines.
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
    }

    this.messaging = admin.messaging();
    this.logger.log('Firebase Admin initialized');
  }

  /**
   * Sends a push notification to a single device token.
   *
   * Safe to call without awaiting — errors are swallowed internally.
   *
   * @param fcmToken  - The recipient device's FCM registration token.
   * @param title     - Notification title (shown in the system tray).
   * @param body      - Notification body text.
   * @param data      - Optional key-value payload for client-side routing.
   *
   * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
   * @version 1.0
   * @since 2026-05-03
   */
  async sendPush(
    fcmToken: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ): Promise<void> {
    if (!this.messaging) return;

    try {
      await this.messaging.send({
        token: fcmToken,
        notification: { title, body },
        data,
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'default' },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `FCM send failed [token=...${fcmToken.slice(-8)}]: ${msg}`,
      );
    }
  }
}
