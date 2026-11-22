import { HttpException, HttpStatus } from '@nestjs/common';

/** Throws the shared error shape `{ error: { code, message } }` (via ApiExceptionFilter). */
export function apiError(status: HttpStatus, code: string, message: string): HttpException {
  return new HttpException({ code, message }, status);
}
