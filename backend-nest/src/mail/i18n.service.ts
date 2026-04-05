import { Injectable } from '@nestjs/common';
import en from './locales/en.json';
import pl from './locales/pl.json';
import uk from './locales/uk.json';

interface LocaleTree {
  [key: string]: string | LocaleTree;
}

@Injectable()
export class I18nService {
  private readonly locales: Record<string, LocaleTree> = { en, pl, uk };

  t(lang: string, key: string): string {
    const keys = key.split('.');
    const primary = this.resolve(this.locales[lang] || this.locales.en, keys);
    if (primary) {
      return primary;
    }

    return this.resolve(this.locales.en, keys) || key;
  }

  private resolve(locale: LocaleTree, keys: string[]): string | null {
    let current: string | LocaleTree | undefined = locale;
    for (const key of keys) {
      if (!current || typeof current === 'string') {
        return null;
      }

      current = current[key];
    }

    return typeof current === 'string' ? current : null;
  }
}
