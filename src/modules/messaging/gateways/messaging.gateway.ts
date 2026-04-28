import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { verifyToken } from '@clerk/backend';
import type { Server, Socket } from 'socket.io';
import { MessagingService } from '../services/messaging.service';

/**
 * WebSocket gateway for MOD-MSG-005 (real-time messaging).
 *
 * Room naming: `channel:<channelId>` — both participants join the same room
 * when they open a conversation. Messages emitted to the room reach all
 * connected devices of both users simultaneously.
 *
 * Authentication: Clerk JWT is verified from `socket.handshake.auth.token`
 * on connection. Unauthenticated clients are disconnected immediately.
 *
 * @author TutorConnect Team
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/messages' })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(private readonly messagingService: MessagingService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      client.data.clerkId = payload.sub;
      this.logger.log(`Connected: ${client.id} (${payload.sub})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated connection: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Disconnected: ${client.id}`);
  }

  /**
   * Client joins a specific channel room to receive its messages.
   * Event payload: `{ channelId: number }`
   */
  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: { channelId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const clerkId: string = client.data.clerkId;
    if (!clerkId) return;

    try {
      // Validates participant access and checks expiry.
      await this.messagingService.assertChannelAccess(data.channelId, clerkId);
    } catch (err: any) {
      client.emit('channel:error', { message: err?.message ?? 'No se puede acceder al canal' });
      return;
    }

    const room = `channel:${data.channelId}`;
    void client.join(room);
    this.logger.log(`${client.id} joined ${room}`);
    client.emit('joined', { channelId: data.channelId });
  }

  /**
   * Client sends a message.
   * Event payload: `{ channelId: number; content: string }`
   * Emits `message:new` to all participants in the channel room.
   */
  @SubscribeMessage('message:send')
  async handleMessage(
    @MessageBody() data: { channelId: number; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const clerkId: string = client.data.clerkId;
    if (!clerkId) return;

    try {
      const message = await this.messagingService.saveMessage(
        data.channelId,
        clerkId,
        data.content,
      );
      this.server.to(`channel:${data.channelId}`).emit('message:new', message);
    } catch (err: any) {
      client.emit('error', { message: err?.message ?? 'Failed to send message' });
    }
  }

  /** Broadcasts a new message to a channel room (called from MessagingService). */
  broadcastToChannel(channelId: number, event: string, payload: unknown) {
    this.server.to(`channel:${channelId}`).emit(event, payload);
  }
}
