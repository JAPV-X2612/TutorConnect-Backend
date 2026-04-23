import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class AuthService {
  private readonly clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  async logout(sessionId: string): Promise<{ message: string }> {
    try {
      await this.clerk.sessions.revokeSession(sessionId);
    } catch (error: any) {
      // Sesión ya expirada o inexistente — tratar como éxito (idempotente)
      const msg: string = error?.message ?? '';
      const status: number = error?.status ?? 0;
      if (status === 404 || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('expir')) {
        return { message: 'Sesión cerrada correctamente' };
      }
      throw new InternalServerErrorException('Error al cerrar sesión');
    }
    return { message: 'Sesión cerrada correctamente' };
  }

  getMe(user: { clerk_id: string; role: string }): {
    clerk_id: string;
    role: string;
    session_activa: boolean;
  } {
    return {
      clerk_id: user.clerk_id,
      role: user.role ?? 'APRENDIZ',
      session_activa: true,
    };
  }
}