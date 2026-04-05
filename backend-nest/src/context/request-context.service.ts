import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContextStore = {
  requestId?: string;
  userId?: string;
  ip?: string;
  method?: string;
  route?: string;
  startTime?: number;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run<T>(context: RequestContextStore, callback: () => T): T {
    const store = {
      ...this.getStore(),
      ...context,
    };

    return this.storage.run(store, callback);
  }

  getStore(): RequestContextStore {
    return this.storage.getStore() || {};
  }

  assign(context: Partial<RequestContextStore>): void {
    const store = this.storage.getStore();
    if (store) {
      Object.assign(store, context);
    }
  }
}
