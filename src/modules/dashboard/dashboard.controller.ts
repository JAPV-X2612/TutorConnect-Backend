import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../auth/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { DashboardService } from './dashboard.service';
import { LearnerDashboardDto } from './dtos/learner-dashboard.dto';
import { TutorDashboardResponseDto } from './dto/tutor-dashboard.dto';

/** Typed shape of the authenticated user attached by {@link ClerkJwtGuard}. */
interface AuthRequest extends Request {
  user: { clerk_id: string; role: UserRole | null; sessionId?: string };
}

/**
 * REST controller for dashboard aggregation endpoints.
 *
 * Exposes one endpoint per role:
 * - `GET /dashboard/learner` — weekly progress and upcoming sessions (HU-06).
 * - `GET /dashboard/tutor` — monthly metrics and upcoming sessions (HU-07).
 *
 * All routes require a valid Clerk Bearer token. Role-restricted endpoints
 * additionally require {@link RoleGuard} with the matching {@link Roles}.
 *
 * @author TutorConnect Team
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Returns the learner's dashboard: weekly progress and upcoming sessions.
   * The clerk_id is extracted exclusively from the validated JWT — never from
   * query params — so a learner can only see their own data (HU-06).
   */
  @Get('learner')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard, RoleGuard)
  @Roles(UserRole.LEARNER)
  @ApiOperation({
    summary:
      "Get the authenticated learner's weekly progress and upcoming sessions (HU-06)",
  })
  @ApiOkResponse({
    type: LearnerDashboardDto,
    description: 'Weekly session progress and the next 5 scheduled sessions.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Access denied. LEARNER role required.',
  })
  getLearnerDashboard(@Req() req: AuthRequest): Promise<LearnerDashboardDto> {
    return this.dashboardService.getLearnerDashboard(req.user.clerk_id);
  }

  /**
   * Returns the tutor's monthly metrics and upcoming sessions.
   * The clerk_id is extracted exclusively from the validated JWT — never from
   * query params — so a tutor can only see their own data (HU-07).
   */
  @Get('tutor')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard, RoleGuard)
  @Roles(UserRole.TUTOR)
  @ApiOperation({
    summary:
      "Get the authenticated tutor's monthly metrics and upcoming sessions (HU-07)",
  })
  @ApiResponse({
    status: 200,
    type: TutorDashboardResponseDto,
    description: 'Current-month metrics and next 5 scheduled sessions.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Access denied. TUTOR role required.',
  })
  getTutorDashboard(
    @Req() req: AuthRequest,
  ): Promise<TutorDashboardResponseDto> {
    return this.dashboardService.getTutorDashboard(req.user.clerk_id);
  }
}
