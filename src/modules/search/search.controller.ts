import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { ClerkRequestUser } from '../auth/clerk-jwt.guard';
import { SearchService } from './search.service';

/**
 * REST controller for MOD-BUS-003 (AI-powered search).
 *
 * Exposes semantic course search and personalized recommendations.
 * Static routes are declared before parameterized ones per Express route-order rules.
 * GET /search and POST /search/index are public; GET /search/recommendations requires auth.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.1
 * @since 2026-05-01
 */
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /search/recommendations?limit=10
   * Returns courses most aligned with the authenticated learner's profile.
   */
  @Get('recommendations')
  @UseGuards(ClerkJwtGuard)
  @HttpCode(HttpStatus.OK)
  async recommendations(@Req() req: Request, @Query('limit') limit?: string) {
    const { clerk_id } = (req as Request & { user: ClerkRequestUser }).user;
    return this.searchService.getRecommendations(
      clerk_id,
      limit ? Math.min(Number(limit), 20) : 10,
    );
  }

  /**
   * POST /search/index
   * Batch-indexes all active courses. Intended for admin / bootstrap use.
   */
  @Post('index')
  @HttpCode(HttpStatus.OK)
  async batchIndex() {
    return this.searchService.batchIndexAll();
  }

  /**
   * GET /search?q=texto&limit=10
   * Semantic full-text search across all active courses. Public endpoint.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async search(@Query('q') query: string, @Query('limit') limit?: string) {
    if (!query?.trim()) return [];
    return this.searchService.semanticSearch(
      query.trim(),
      limit ? Math.min(Number(limit), 20) : 10,
    );
  }
}
