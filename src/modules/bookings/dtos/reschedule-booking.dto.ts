import { IsDateString } from 'class-validator';

/**
 * Payload for rescheduling an existing booking to a new time slot.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.0
 * @since 2026-05-03
 */
export class RescheduleBookingDto {
  @IsDateString()
  newStartTime: string;
}
