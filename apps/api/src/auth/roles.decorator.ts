import { SetMetadata } from '@nestjs/common';
import type { Role } from '@blurt/shared/schemas';

export const ROLES = 'roles';

/** Restricts a controller or route to these roles (ADMIN always passes). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
