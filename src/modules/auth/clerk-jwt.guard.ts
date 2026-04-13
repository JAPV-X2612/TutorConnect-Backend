import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest(); // TODO: Fix error
    const authHeader: string | undefined = request.headers['authorization']; // TODO: Fix error

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token requerido');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      request.user = { // TODO: Fix error
        clerk_id: payload.sub,
        role: (payload as any).role as string, // TODO: Fix error
      };

      return true;
    } catch (error: any) {
      const msg: string = error?.message ?? ''; // TODO: Fix error
      if (
        error?.reason === 'token-expired' ||
        msg.toLowerCase().includes('expir')
      ) {
        throw new UnauthorizedException('Token expirado');
      }
      throw new UnauthorizedException('Token inválido');
    }
  }
}
