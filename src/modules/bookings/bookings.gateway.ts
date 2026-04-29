import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/bookings' })
export class BookingsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BookingsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client sends { clerkId, role } to join their private room.
   * Room name: "learner:<clerkId>" or "tutor:<clerkId>"
   */
  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { clerkId: string; role: 'LEARNER' | 'TUTOR' },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `${data.role.toLowerCase()}:${data.clerkId}`;
    void client.join(room);
    this.logger.log(`${client.id} joined room ${room}`);
    client.emit('joined', { room });
  }

  /** Notify a specific learner that one of their bookings changed. */
  notifyLearner(learnerClerkId: string, booking: object) {
    this.server
      .to(`learner:${learnerClerkId}`)
      .emit('booking:updated', booking);
  }

  /** Notify a specific tutor that a new booking arrived or was cancelled. */
  notifyTutor(tutorClerkId: string, booking: object) {
    this.server.to(`tutor:${tutorClerkId}`).emit('booking:updated', booking);
  }
}
