import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Weekly session progress for the learner.
 *
 * @author TutorConnect Team
 */
export class WeeklyProgressDto {
  @ApiProperty({ description: 'Sessions completed this week', example: 3 })
  @Expose()
  completed: number;

  @ApiProperty({ description: 'Total sessions scheduled this week', example: 5 })
  @Expose()
  total: number;
}

/**
 * Summary of an upcoming tutoring session.
 *
 * @author TutorConnect Team
 */
export class UpcomingSessionDto {
  @ApiProperty({ example: 'abc-123' })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'Álgebra Lineal',
    description: 'Subject or topic of the session. Derived from the tutor primary subject.',
  })
  @Expose()
  subject: string;

  @ApiProperty({ example: 'Carlos García' })
  @Expose()
  tutorName: string;

  @ApiProperty()
  @Expose()
  scheduledAt: Date;

  @ApiProperty({ example: 'confirmed' })
  @Expose()
  status: string;
}

/**
 * Full response payload for the learner dashboard endpoint.
 *
 * @author TutorConnect Team
 */
export class LearnerDashboardDto {
  @ApiProperty({ type: WeeklyProgressDto })
  @Expose()
  @Type(() => WeeklyProgressDto)
  weeklyProgress: WeeklyProgressDto;

  @ApiProperty({ type: [UpcomingSessionDto] })
  @Expose()
  @Type(() => UpcomingSessionDto)
  upcomingSessions: UpcomingSessionDto[];
}
