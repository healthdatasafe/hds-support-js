import { pryv } from 'hds-lib';
import type { SupportConnection, SupportMonitor } from './types';

/**
 * Default live feed: a `pryv.Monitor` on the chat scope with the socket.io update method (hds-lib's pryv
 * carries both plugins). `start()` resolves after the first fetch and once the socket method is attached.
 *
 * `@pryv/monitor` 3.17.3 resolves `start()` before the socket has subscribed (B-2026-11-01-1), so a message
 * landing in that window is only seen at the next change; `SupportClient` therefore calls `updateEvents()`
 * once more after a short settle.
 */
export function createPryvMonitor (connection: SupportConnection, scope: { streams: string[]; types?: string[] }): SupportMonitor {
  const Monitor = (pryv as any).Monitor;
  const monitor = new Monitor(connection, scope);
  const wrapper: SupportMonitor = {
    on (event, cb) {
      monitor.on(event, cb);
      return wrapper;
    },
    async start () {
      await monitor.start();
      monitor.addUpdateMethod(new Monitor.UpdateMethod.Socket());
    },
    updateEvents: () => monitor.updateEvents(),
    stop: () => { monitor.stop(); }
  };
  return wrapper;
}
