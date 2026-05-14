import {
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class InitiatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    String(value).replace(/\s+/g, ''),
  )
  @Matches(/^\d{13,19}$/, { message: 'cardNumber must contain 13–19 digits' })
  cardNumber: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth: number;

  @IsInt()
  @Min(2024)
  expiryYear: number;

  @IsString()
  @Length(3, 4)
  @Matches(/^\d{3,4}$/, { message: 'cvv must be 3 or 4 digits' })
  cvv: string;

  @IsString()
  @IsNotEmpty()
  cardholderName: string;
}
