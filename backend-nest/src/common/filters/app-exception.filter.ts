import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { AppLoggerService } from '../../logger/logger.service';
import { AppError } from '../errors/app-error';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly config: AppConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string; user?: { id?: string; sub?: string } }>();
    const res = ctx.getResponse<Response>();

    const appError = this.normalizeException(exception);
    const status = appError.status || 500;
    const level = status >= 500 ? 'error' : 'warn';

    this.logger.getLogger('app')[level](
      {
        event: 'error',
        requestId: req.requestId,
        status,
        code: appError.code || 'SOMETHING_WRONG',
        message: appError.message,
        stack: this.config.isDevelopment ? appError.stack : undefined,
        meta: appError.meta,
      },
      'Unhandled error',
    );

    const errorBody: Record<string, unknown> = {
      code: appError.code || 'SOMETHING_WRONG',
    };

    if (appError.code === 'VALIDATION_ERROR') {
      errorBody.message = appError.meta?.message;
      errorBody.fields = appError.meta?.fields;
    }

    if (this.config.isDevelopment) {
      errorBody.stack = appError.stack;
    }

    res.status(status).json({
      error: errorBody,
    });
  }

  private normalizeException(exception: unknown): AppError {
    if (exception instanceof AppError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      return new AppError('SOMETHING_WRONG', exception.getStatus(), {
        response: exception.getResponse(),
      });
    }

    if (exception instanceof Error) {
      return new AppError('SOMETHING_WRONG', 500, {
        message: exception.message,
      });
    }

    return new AppError('SOMETHING_WRONG', 500);
  }
}
