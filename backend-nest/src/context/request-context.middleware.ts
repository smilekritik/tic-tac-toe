import { Injectable, NestMiddleware } from '@nestjs/common';
import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { nowMs } from '../common/time/dayjs';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string | undefined) || this.generateRequestId();
    const context = {
      requestId,
      ip: req.ip,
      method: req.method,
      route: req.originalUrl || req.url,
      startTime: nowMs(),
    };

    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader('x-request-id', requestId);

    this.requestContext.run(context, () => next());
  }

  private generateRequestId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  }
}
