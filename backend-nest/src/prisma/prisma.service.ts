import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfigService) {
    super({
      datasources: config.databaseUrl
        ? {
            db: {
              url: config.databaseUrl,
            },
          }
        : undefined,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
