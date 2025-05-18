import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../user/models/user.entity';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles); 