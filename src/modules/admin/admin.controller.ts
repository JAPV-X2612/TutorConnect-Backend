import {
  Controller,
  Post,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminMetricsService } from './admin-metrics.service';
import { AdminMetricsQueryDto } from './dtos/admin-metrics-query.dto';
import { AdminMetricsResponseDto } from './dtos/admin-metrics-response.dto';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../auth/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminMetricsService: AdminMetricsService,
  ) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed() {
    const result = await this.adminService.runDemoSeed();
    return { ok: true, ...result };
  }

  @Post('index')
  @HttpCode(HttpStatus.OK)
  async index() {
    const result = await this.adminService.runIndex();
    return { ok: true, ...result };
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getMetrics(@Query() query: AdminMetricsQueryDto): Promise<AdminMetricsResponseDto> {
    return this.adminMetricsService.getMetrics(query);
  }
}
