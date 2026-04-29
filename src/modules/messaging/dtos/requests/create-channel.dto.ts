import { IsOptional, IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateChannelDto {
  /** Clerk ID of the other participant. */
  @IsString()
  @IsNotEmpty()
  otherClerkId: string;

  /** Course this conversation is about (optional, used for pre-booking chats). */
  @IsOptional()
  @IsUUID()
  courseId?: string;
}
