import { pryv } from 'hds-lib';
import type { SupportConnection, SupportMonitor } from './types';

/**
 * Default live feed: a `pryv.Monitor` on the chat scope with the socket.io update method (hds-lib's pryv
 * carries both plugins). The socket method is attached before `start()`, so `start()` resolves once the first
 * fetch is done and the socket has subscribed; the socket then fetches once more what changed in between
 * (`@pryv/monitor` 3.18+, B-2026-11-01-1).
 */
export function createPryvMonitor (connection: SupportConnection, scope: { streams: string[]; types?: string[] }): SupportMonitor {
  const Monitor = (pryv as any).Monitor;
  const monitor = new Monitor(connection, scope).addUpdateMethod(new Monitor.UpdateMethod.Socket());
  const wrapper: SupportMonitor = {
    on (event, cb) {
      monitor.on(event, cb);
      return wrapper;
    },
    async start () {
      await monitor.start();
    },
    updateEvents: () => monitor.updateEvents(),
    stop: () => { monitor.stop(); }
  };
  return wrapper;
}
