import { lan } from './lan-api';
import { decode, encode, type LanMessage } from './protocol';
import type { PluginListenerHandle } from '@capacitor/core';

export interface LanTransport {
  send(message: LanMessage): void;
  onMessage(handler: (message: LanMessage) => void): Promise<PluginListenerHandle | void>;
  setHandlers?(onOpen: () => void, onMessage: (message: LanMessage) => void): void;
  close(): void;
}

/** The host forwards guest messages from the native plugin to the game. */
export class HostTransport implements LanTransport {
  constructor(private readonly guestId: () => string | undefined) {}

  send(message: LanMessage): void {
    const id = this.guestId();
    if (id !== undefined) void lan.send(id, encode(message));
  }

  async onMessage(handler: (message: LanMessage) => void): Promise<PluginListenerHandle | void> {
    return lan.onMessage((event) => {
      if (event.clientId !== this.guestId()) return;
      const message = decode(event.text);
      if (message !== null) handler(message);
    });
  }

  close(): void {
    void lan.stop();
  }
}

/** The guest talks straight to the host phone over the local network. */
export class GuestTransport implements LanTransport {
  private readonly socket: WebSocket;

  constructor(host: string, port: number) {
    this.socket = new WebSocket(`ws://${host}:${port}`);
  }

  setHandlers(onOpen: () => void, onMessage: (message: LanMessage) => void): void {
    this.socket.onopen = onOpen;
    this.socket.onmessage = (event: MessageEvent<string>) => {
      const message = decode(event.data);
      if (message !== null) onMessage(message);
    };
    this.socket.onerror = () => onMessage({ t: 'end', winner: null });
    this.socket.onclose = () => onMessage({ t: 'end', winner: null });
  }

  send(message: LanMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(encode(message));
  }

  async onMessage(): Promise<PluginListenerHandle | void> {
    // Guest messages arrive through the WebSocket constructor callbacks.
  }

  close(): void {
    this.socket.close();
  }
}
