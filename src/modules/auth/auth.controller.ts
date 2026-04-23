import { Controller, Post, Get, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ClerkJwtGuard } from './clerk-jwt.guard';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('logout')
  @UseGuards(ClerkJwtGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar sesión activa del usuario' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada correctamente' })
  @ApiResponse({ status: 401, description: 'Token requerido o inválido' })
  @ApiResponse({ status: 500, description: 'Error al cerrar sesión' })
  async logout(@Req() req: any): Promise<{ message: string }> {
    return this.authService.logout(req.user.sessionId);
  }

  @Get('me')
  @UseGuards(ClerkJwtGuard)
  @ApiOperation({ summary: 'Verificar sesión activa del usuario' })
  @ApiResponse({ status: 200, description: 'Estado de sesión activa' })
  @ApiResponse({ status: 401, description: 'Token requerido o expirado' })
  getMe(@Req() req: any): { clerk_id: string; role: string; session_activa: boolean } {
    return this.authService.getMe(req.user);
  }
}
