import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface LanDevice {
  name: string;
  host: string;
  port: number;
  code: string;
}

interface LanMessages {
  message: { clientId: string; text: string };
  devices: { devices: LanDevice[] };
  connection: { clientId: string };
  disconnect: { clientId: string };
  error: { message: string };
}

interface LanPlugin {
  startHost(options: { code: string }): Promise<{ port: number; code: string }>;
  scan(): Promise<void>;
  send(options: { clientId: string; text: string }): Promise<void>;
  stop(): Promise<void>;
  addListener<E extends keyof LanMessages>(
    eventName: E,
    listenerFunc: (event: LanMessages[E]) => void,
  ): Promise<PluginListenerHandle>;
}

const plugin = registerPlugin<LanPlugin>('BlockClashLan');

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * A browser can only open a LAN WebSocket when the page itself is served over
 * plain HTTP. GitHub Pages is HTTPS, so browsers there cannot join a LAN game.
 */
export function canUseLan(): boolean {
  return isNative() || window.location.protocol === 'http:';
}

export function generateCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0]! % 1000000).padStart(6, '0');
}

export const lan = {
  startHost: (code: string) => plugin.startHost({ code }),
  scan: () => plugin.scan(),
  send: (clientId: string, text: string) => plugin.send({ clientId, text }),
  stop: () => plugin.stop(),
  onMessage: (fn: (event: LanMessages['message']) => void) => plugin.addListener('message', fn),
  onDevices: (fn: (event: LanMessages['devices']) => void) => plugin.addListener('devices', fn),
  onConnection: (fn: (event: LanMessages['connection']) => void) =>
    plugin.addListener('connection', fn),
  onDisconnect: (fn: (event: LanMessages['disconnect']) => void) =>
    plugin.addListener('disconnect', fn),
  onError: (fn: (event: LanMessages['error']) => void) => plugin.addListener('error', fn),
};
