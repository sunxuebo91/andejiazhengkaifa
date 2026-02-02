import { PartialType } from '@nestjs/swagger';
import { RegisterMiniProgramUserDto } from './register-miniprogram-user.dto';

export class UpdateMiniProgramUserDto extends PartialType(RegisterMiniProgramUserDto) {}

