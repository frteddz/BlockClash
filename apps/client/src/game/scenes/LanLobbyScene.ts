import Phaser from 'phaser';
import type { PluginListenerHandle } from '@capacitor/core';
import { canUseLan, generateCode, isNative, lan, type LanDevice } from '../lan/lan-api';
import { HostTransport, GuestTransport } from '../lan/lan-session';
import { makeButton, makePanel } from '../ui/button';
import { COLOR, CSS, FONT, uiPx } from '../theme';

export class LanLobbyScene extends Phaser.Scene {
  private listeners: PluginListenerHandle[] = [];
  private roomCode = '';
  private seed = 0;
  private guestId: string | undefined;
  private statusText?: Phaser.GameObjects.Text;
  private listObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('LanLobby');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLOR.background);

    this.add
      .text(width / 2, height * 0.14, 'OFFLINE DUEL', {
        fontFamily: FONT.display,
        fontSize: `${Math.max(uiPx(30), Math.min(uiPx(56), width * 0.09))}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);

    if (!canUseLan()) {
      this.add
        .text(
          width / 2,
          height * 0.44,
          'LAN duel cannot run from a secure website.\nUse the Android app, or run the PC LAN host and open its HTTP address.',
          {
            fontFamily: FONT.ui,
            fontSize: `${uiPx(18)}px`,
            color: CSS.soft,
            align: 'center',
          },
        )
        .setOrigin(0.5);
    } else {
      const buttonWidth = Math.min(uiPx(300), width * 0.75);
      let y = height * 0.35;
      if (isNative()) {
        makeButton(this, width / 2, y, 'HOST GAME', () => this.host(), {
          width: buttonWidth,
          height: uiPx(60),
          fontSize: uiPx(24),
          fill: COLOR.green,
        });
        y += uiPx(80);
      }
      makeButton(this, width / 2, y, 'FIND A GAME', () => this.join(), {
        width: buttonWidth,
        height: uiPx(60),
        fontSize: uiPx(24),
      });
    }

    this.statusText = this.add
      .text(width / 2, height * 0.27, '', {
        fontFamily: FONT.ui,
        fontSize: `${uiPx(17)}px`,
        color: CSS.soft,
        align: 'center',
      })
      .setOrigin(0.5);

    makeButton(this, uiPx(62), uiPx(42), 'BACK', () => this.leave(), {
      width: uiPx(96),
      height: uiPx(48),
      fontSize: uiPx(17),
      fill: COLOR.ink,
      sound: 'ui_back',
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const handle of this.listeners) void handle.remove();
      this.listeners = [];
      void lan.stop();
    });
  }

  private setStatus(text: string): void {
    if (this.statusText?.active) this.statusText.setText(text);
  }

  private async host(): Promise<void> {
    this.roomCode = generateCode();
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    this.seed = buffer[0]!;
    this.guestId = undefined;

    this.listeners.push(
      await lan.onConnection((event) => {
        this.guestId = event.clientId;
        const transport = new HostTransport(() => this.guestId);
        this.scene.start('LanMatch', {
          role: 'host',
          seed: this.seed,
          code: this.roomCode,
          transport,
        });
      }),
    );
    this.listeners.push(await lan.onError((event) => this.setStatus(event.message)));

    try {
      const host = await lan.startHost(this.roomCode);
      this.setStatus(
        `Your code: ${this.roomCode}\nPort: ${host.port}\nWaiting for a player on the same WiFi...`,
      );
    } catch (error) {
      this.setStatus(`Could not host: ${String(error)}`);
    }
  }

  private async join(): Promise<void> {
    if (!isNative()) {
      const answer = window.prompt('Host address (IP:port)', `${window.location.hostname}:5175`);
      if (answer === null || answer.trim() === '') return;
      const [host, portText] = answer.trim().split(':');
      const port = Number(portText ?? '5175');
      if (host === undefined || !Number.isInteger(port)) {
        this.setStatus('That address is not valid.');
        return;
      }
      this.scene.start('LanMatch', {
        role: 'guest',
        code: '----',
        transport: new GuestTransport(host, port),
      });
      return;
    }
    this.listeners.push(
      await lan.onDevices((event) => this.showDevices(event.devices)),
    );
    this.listeners.push(await lan.onError((event) => this.setStatus(event.message)));
    this.setStatus('Looking for players on this WiFi...');
    try {
      await lan.scan();
    } catch (error) {
      this.setStatus(`Could not scan: ${String(error)}`);
    }
  }

  private showDevices(devices: LanDevice[]): void {
    for (const object of this.listObjects) object.destroy();
    this.listObjects = [];
    const { width, height } = this.scale;
    const startY = height * 0.58;
    const rowHeight = uiPx(70);
    const visible = devices.slice(0, 4);

    if (visible.length === 0) {
      this.setStatus('No players found yet. Keep both phones on the same WiFi.');
      return;
    }
    this.setStatus('Tap a player to join:');

    visible.forEach((device, index) => {
      const y = startY + index * rowHeight;
      const widthPx = Math.min(uiPx(360), width * 0.85);
      this.listObjects.push(makePanel(this, width / 2, y, widthPx, rowHeight - uiPx(8)));
      this.listObjects.push(
        this.add
          .text(width / 2, y - uiPx(12), `${device.name}   CODE ${device.code}`, {
            fontFamily: FONT.ui,
            fontSize: `${uiPx(15)}px`,
            color: CSS.ink,
          })
          .setOrigin(0.5),
      );
      this.listObjects.push(
        makeButton(this, width / 2, y + uiPx(14), 'CONNECT', () => {
          const transport = new GuestTransport(device.host, device.port);
          this.scene.start('LanMatch', { role: 'guest', code: device.code, transport });
        }, {
          width: widthPx - uiPx(30),
          height: uiPx(28),
          fontSize: uiPx(14),
        }),
      );
    });
  }

  private leave(): void {
    this.scene.start('Menu');
  }
}
