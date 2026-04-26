import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';

/**
 * Authentication service for MOD-AUT-001.
 *
 * Responsible solely for identity verification: "who is the user?".
 * Profile management ("what does the user do?") lives in {@link UsersService}.
 *
 * JWT validation is performed upstream by {@link ClerkJwtGuard} before any
 * method here is invoked; this service operates on already-verified identities.
 *
 * @author TutorConnect Team
 */
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
