import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import pino, { type Logger } from 'pino';
import { AppConfigService } from '../config/app-config.service';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class AppLoggerService {
  private readonly logger: Logger;

  constructor(
    private readonly config: AppConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    const logsDir = path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const fileStream = fs.createWriteStream(path.join(logsDir, 'app.log'), {
      flags: 'a',
    });

    this.logger = pino(
      {
        level: this.config.logLevel,
        timestamp: pino.stdTimeFunctions.isoTime,
        messageKey: 'message',
      },
      pino.multistream([
        { stream: process.stdout },
        { stream: fileStream },
      ]),
    );
  }

  getLogger(service: string): Logger {
    const store = this.requestContext.getStore();

    return this.logger.child({
      service,
      requestId: store.requestId,
      userId: store.userId,
      ip: store.ip,
      route: store.route,
      method: store.method,
    });
  }
}
