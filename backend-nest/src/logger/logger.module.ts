import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { AppLoggerService } from './logger.service';

@Global()
@Module({
  providers: [AppConfigService, AppLoggerService],
  exports: [AppConfigService, AppLoggerService],
})
export class LoggerModule {}
