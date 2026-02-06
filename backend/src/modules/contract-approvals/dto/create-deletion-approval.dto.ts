import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDeletionApprovalDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ApproveDeletionDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

export class RejectDeletionDto {
  @IsString()
  @IsNotEmpty()
  comment: string;
}

