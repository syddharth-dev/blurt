import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError } from '@blurt/shared/schemas';

/** Every error leaves the API as `{ error: { code, message } }` (docs/DATA_AND_API.md). */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const code =
        typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string'
          ? body.code
          : (HttpStatus[status] ?? 'ERROR');
      res.status(status).json({ error: { code, message: exception.message } } satisfies ApiError);
      return;
    }

    this.logger.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong.' },
    } satisfies ApiError);
  }
}
