/**
 * PC LAN host. Serves the built web game over HTTP so a browser on the same
 * WiFi can join, and hosts a WebSocket match using the shared game core.
 *
 * Run with: pnpm lan:pc
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { Bonjour } from 'bonjour-service';
import { applyMove, createMatch, startMatch } from '../../packages/shared/dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const webDir = path.join(root, 'apps/client/dist');
const port = Number(process.env.LAN_PORT ?? 5175);
const code = String(randomInt(0, 1000000)).padStart(6, '0');

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
};

const httpServer = createServer((request, response) => {
  const url = decodeURIComponent((request.url ?? '/').split('?')[0]);
  const relative = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = path.join(webDir, relative);
  if (!file.startsWith(webDir) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
});

const wss = new WebSocketServer({ server: httpServer });
const players = new Map();
let match = createMatch(randomInt(0, 2 ** 30));
let started = false;

function send(socket, message) {
  if (socket.readyState === 1) socket.send(JSON.stringify(message));
}

function broadcast(message) {
  for (const socket of players.keys()) send(socket, message);
}

wss.on('connection', (socket) => {
  if (players.size >= 2) {
    send(socket, { t: 'end', winner: null });
    socket.close();
    return;
  }
  const youAre = players.size === 0 ? 0 : 1;
  players.set(socket, youAre);
  send(socket, { t: 'welcome', seed: match.seed, youAre });

  if (players.size === 2) {
    broadcast({ t: 'countdown', seed: match.seed });
    setTimeout(() => {
      match = startMatch(match);
      started = true;
      broadcast({ t: 'start' });
    }, 3000);
  }

  socket.on('message', (raw) => {
    if (!started) return;
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (message.t !== 'move') return;
    const outcome = applyMove(match, youAre, {
      setIndex: message.setIndex,
      pieceIndex: message.pieceIndex,
      x: message.x,
      y: message.y,
    });
    if (!outcome.ok) return;
    match = outcome.state;
    broadcast({ t: 'state', match, events: outcome.events });
  });

  socket.on('close', () => {
    players.delete(socket);
    if (started) {
      const remaining = [...players.values()][0];
      if (remaining !== undefined) {
        send([...players.keys()][0], { t: 'end', winner: remaining });
      }
    }
  });
});

const bonjour = new Bonjour();
bonjour.publish({ name: `BlockClash-${code}`, type: 'blockclash', port, txt: { code } });

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`BlockClash LAN host running on port ${port}`);
  console.log(`Code: ${code}`);
  console.log('Open this PC at http://localhost:' + port + ' and choose OFFLINE DUEL > FIND A GAME.');
  console.log('On a phone, choose OFFLINE DUEL > FIND A GAME.');
});
