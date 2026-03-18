import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  requestId: string;
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
}

type RequestContextPatch = Partial<RequestContextData>;

export class RequestContextStore {
  private static readonly storage = new AsyncLocalStorage<RequestContextData>();

  static run<T>(context: RequestContextData, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  static get(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  static getValue<K extends keyof RequestContextData>(key: K): RequestContextData[K] | undefined {
    return this.storage.getStore()?.[key];
  }

  static set(patch: RequestContextPatch): void {
    const store = this.storage.getStore();
    if (!store) return;
    Object.assign(store, patch);
  }
}

