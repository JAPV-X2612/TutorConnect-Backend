/**
 * Defines the possible states of a TutorConnect payment transaction.
 *
 * The payment flow follows the SAGA pattern:
 *   PENDING → PROCESSING → COMPLETED | FAILED | CANCELLED
 *   COMPLETED → REFUNDED | DISPUTED
 *
 * @author TutorConnect Team
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}
