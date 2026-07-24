import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApplicationError,
  ApplicationErrorKind,
} from '@/application/shared/errors/application.error';

const statusByKind: Record<ApplicationErrorKind, HttpStatus> = {
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  UNPROCESSABLE: HttpStatus.UNPROCESSABLE_ENTITY,
  UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
};

@Catch(ApplicationError)
export class ApplicationErrorFilter
  implements ExceptionFilter<ApplicationError>
{
  catch(exception: ApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = statusByKind[exception.kind];
    response.status(statusCode).json({
      statusCode,
      code: exception.code,
      message: exception.message,
      retryable: exception.retryable,
      ...(exception.details ? { details: exception.details } : {}),
    });
  }
}
