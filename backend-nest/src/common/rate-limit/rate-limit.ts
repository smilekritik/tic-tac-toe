import { Injectable } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { AppLoggerService } from '../../logger/logger.service';
import { RequestContextService } from '../../context/request-context.service';
import { AppError } from '../errors/app-error';
import { nowMs } from '../time/dayjs';

type LimiterOptions = {
  windowMs: number;
  max: number;
  code: string;
  message: string;
  keyGenerator?: (req: Request) => string;
};

export function getUserOrIpKey(req: Request): string {
  const user = (req as Request & { user?: { sub?: string; id?: string } }).user;
  const userId = user?.sub || user?.id;
  return userId ? `user:${userId}` : `ip:${req.ip}`;
}

export function createRateLimiter(
  options: LimiterOptions,
  logger: AppLoggerService,
  requestContext: RequestContextService,
) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip || 'unknown'),
    handler: (req: Request, res: Response, _next: NextFunction, _details) => {
      const context = {
        requestId: (req as Request & { requestId?: string }).requestId,
        ip: req.ip,
        method: req.method,
        route: req.originalUrl || req.url,
        userId: (req as Request & { user?: { id?: string; sub?: string } }).user?.id
          || (req as Request & { user?: { id?: string; sub?: string } }).user?.sub,
      };

      requestContext.run(context, () => {
        logger.getLogger('security').warn(
          {
            event: 'http_rate_limit_hit',
            requestId: context.requestId,
            ip: req.ip,
            route: req.originalUrl || req.url,
            method: req.method,
            code: options.code,
          },
          'HTTP rate limit hit',
        );
      });

      res.status(429).json({
        error: {
          code: options.code,
          message: options.message,
        },
      });
    },
  });
}

@Injectable()
export class BusinessRateLimitService {
  private readonly buckets = new Map<string, number[]>();

  constructor(
    private readonly logger: AppLoggerService,
    private readonly requestContext: RequestContextService,
  ) {}

  enforce(options: {
    key: string;
    maxInWindow?: number;
    windowMs?: number;
    minIntervalMs?: number;
  }): void {
    const timestamps = this.buckets.get(options.key) || [];
    const now = nowMs();

    if (options.minIntervalMs && timestamps.length) {
      const delta = now - timestamps[timestamps.length - 1];
      if (delta < options.minIntervalMs) {
        const retryAfterMs = options.minIntervalMs - delta;
        this.logRateLimitHit(options.key, 'minIntervalMs', retryAfterMs);
        throw new AppError('BUSINESS_RATE_LIMIT', 429, { retryAfterMs });
      }
    }

    if (options.maxInWindow && options.windowMs) {
      const cutoff = now - options.windowMs;
      while (timestamps.length && timestamps[0] < cutoff) {
        timestamps.shift();
      }

      if (timestamps.length >= options.maxInWindow) {
        const retryAfterMs = Math.max(0, timestamps[0] + options.windowMs - now);
        this.logRateLimitHit(options.key, 'maxInWindow', retryAfterMs);
        throw new AppError('BUSINESS_RATE_LIMIT', 429, { retryAfterMs });
      }
    }

    timestamps.push(now);
    this.buckets.set(options.key, timestamps);
  }

  reset(): void {
    this.buckets.clear();
  }

  private logRateLimitHit(key: string, reason: string, retryAfterMs: number): void {
    this.requestContext.run(this.requestContext.getStore(), () => {
      this.logger.getLogger('security').warn(
        {
          event: 'business_rate_limit_hit',
          key,
          reason,
          retryAfterMs,
        },
        'Business rate limit hit',
      );
    });
  }
}
