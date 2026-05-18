import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
  async getMetrics(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.adminService.getAdminMetrics(from, to);
  }
}
