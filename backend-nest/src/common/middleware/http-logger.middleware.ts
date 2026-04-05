import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextService } from '../../context/request-context.service';
import { AppLoggerService } from '../../logger/logger.service';
import { nowMs } from '../time/dayjs';

const SENSITIVE_KEYS = ['password', 'newPassword', 'token', 'refreshToken', 'accessToken'];

function sanitizeObject(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item));
  }

  const clone: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      continue;
    }

    clone[key] = entry && typeof entry === 'object' ? sanitizeObject(entry) : entry;
  }

  return clone;
}

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  use(req: Request & { requestId?: string; user?: { id?: string; sub?: string } }, res: Response, next: NextFunction): void {
    const start = nowMs();

    this.logger.getLogger('http').info(
      {
        event: 'request_start',
        requestId: req.requestId,
        method: req.method,
        route: req.originalUrl || req.url,
        ip: req.ip,
        userId: req.user?.id || req.user?.sub,
        userAgent: req.headers['user-agent'],
        query: sanitizeObject(req.query),
        params: sanitizeObject(req.params),
        body: sanitizeObject(req.body),
      },
      'Incoming request',
    );

    res.on('finish', () => {
      const context = {
        requestId: req.requestId,
        ip: req.ip,
        method: req.method,
        route: req.originalUrl || req.url,
        userId: req.user?.id || req.user?.sub,
      };

      this.requestContext.run(context, () => {
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        this.logger.getLogger('http')[level](
          {
            event: 'request_finish',
            requestId: req.requestId,
            statusCode: res.statusCode,
            durationMs: nowMs() - start,
            ip: req.ip,
            method: req.method,
            route: req.originalUrl || req.url,
            userId: req.user?.id || req.user?.sub,
          },
          'Request completed',
        );
      });
    });

    next();
  }
}
