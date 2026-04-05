import { Module } from '@nestjs/common';
import { I18nService } from './i18n.service';
import { MailService } from './mail.service';

@Module({
  providers: [I18nService, MailService],
  exports: [I18nService, MailService],
})
export class MailModule {}
