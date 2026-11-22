import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Opt a route out of authentication. Every route requires a valid Supabase JWT by default. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
