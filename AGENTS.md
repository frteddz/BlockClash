# BlockClash: Agent Guide

Read this whole file before doing anything. It is the source of truth for the project. If a decision changes, update this file and log it in `DECISIONS.md`.

## 1. What we are building

**BlockClash** (one word, capital B and C) is a cartoony, chill, head-to-head block puzzle game. The core feel is a Block Blast-style puzzle (drag pieces onto a grid, clear lines). **There is NO single-player mode. Every match is versus.**

One codebase ships as:

- a browser version (PC, TV browser, phone browser)
- an Android APK (wrapped with Capacitor)

Do not use the name, art, sounds or branding of any existing game. Game mechanics are fine to reuse; assets and branding are not.

## 2. Game modes

1. **Bot Versus**: play against an AI on the device. Works with no internet. Difficulties: Easy, Medium, Hard.
2. **Online Versus** (needs servers):
   - Quick Match: random opponent
   - Private Duel: host gets a **6-digit code**, the other player types it in
   - Friend invite: invite a friend directly (also shows the 6-digit code)
3. **Offline Versus**: two humans, no internet.
   - Variant A: same device, split screen. Build this first.
   - Variant B: LAN across two devices. See open question Q3 before building.

Also required: **profiles** and a **friends list** (see section 7).

## 3. Core rules (defaults)

Every number below lives in `packages/shared/src/config.ts` so it can be tuned without touching logic.

- Board: 8x8. A tray of 3 pieces. No rotation. Drag and drop to place. When all 3 are placed, a new set of 3 arrives.
- A full row or full column clears. Clearing several lines at once, or clearing on consecutive placements (combo / streak), scores more.
- **Fairness:** both players get the same piece sets. Set number k is identical for both players. Generate sets from a seeded PRNG: `set(k) = f(matchSeed, k)`. No `Math.random()` anywhere in game logic.
- **Attack:** clearing 2+ lines at once, or reaching a combo threshold, sends garbage to the opponent. Garbage = gray locked cells placed on random empty cells of the opponent's board. The positions must be deterministic from `matchSeed` and an event index. Garbage cells count toward line completion and disappear when their line clears. Cap garbage per attack, and never place it so the board is instantly dead by itself.
- **Lose:** none of your 3 current pieces fits anywhere. The opponent wins. If both are stuck at the same time, higher score wins.
- Match length and any timed mode: see open question Q4. Start with survival.

## 4. Tech stack (proposed, confirm hosting and accounts with the user first)

- TypeScript (strict) everywhere.
- Monorepo with pnpm workspaces.
- `packages/shared`: pure TypeScript game core and network protocol. No Phaser, no DOM, no Node-only APIs. Deterministic.
- `apps/client`: Phaser 3 + Vite. Capacitor wraps the built web app for Android.
- `apps/server`: Node.js + `ws` (WebSocket). Authoritative game server: rooms, matchmaking, move validation.
- Accounts, profiles, friends: Supabase (Auth with guest/anonymous sign-in, Postgres with Row Level Security) is the proposal. Firebase is the alternative. Do not commit to one without asking the user (Q2).
- Tests: Vitest. Lint and format: ESLint + Prettier.
- Message schemas validated at runtime (zod or similar) on the server.

### Repo layout

```
BlockClash/
  AGENTS.md
  DECISIONS.md
  assets/                 raw downloaded assets (source of truth, see section 8)
  packages/shared/        game core, bot, protocol, config
  apps/client/            Phaser + Vite (+ Capacitor android/)
  apps/server/            WebSocket game server
```

### Commands

Fill these in as soon as they exist, and keep them correct:

- install: `pnpm install`
- client dev: `pnpm dev` (copies assets first, then Vite at http://localhost:5173; if that port is taken, Vite prints the next one, e.g. 5174)
- server dev: `pnpm dev:server` (Phase 3 - prints a "not built yet" message for now)
- test: `pnpm test` (shared-core unit tests); `pnpm test:watch` while developing
- build web: `pnpm build` (copies assets, typechecks, outputs `apps/client/dist/`)
- build android APK: `pnpm build:apk` (needs Android SDK + JDK 17/21; outputs `BlockClash-v1.apk` in the repo root)
- lint / format: `pnpm lint`, `pnpm lint:fix`, `pnpm format`, `pnpm format:check`
- typecheck all packages: `pnpm typecheck`
- rebuild copied assets only: `pnpm assets`

## 5. Multiplayer design

- **Server is authoritative.** Never trust the client. The server runs the same `shared` game core for each player's board, rejects illegal moves, and decides win or loss.
- Clients simulate their own moves immediately (optimistic) and reconcile if the server disagrees.
- Because piece sets are deterministic from the seed, only small events cross the network (moves, attacks), never whole boards per frame.
- Client to server: `createRoom`, `joinRoom {code}`, `queue`, `ready`, `move {setIndex, pieceIndex, x, y}`, `ping`.
- Server to client: `matchStart {seed, config, opponent}`, `moveAck`, `opponentMove`, `attack`, `matchEnd`, `error`.
- Reconnect: 30 second grace window to rejoin a live match, then forfeit.
- Match start uses a server timestamp so both clients run the countdown together.

### 6-digit room codes

- Generate with a cryptographically secure RNG, numeric, 6 digits, unique among live rooms.
- Single use, expires after 10 minutes if nobody joins, freed when the room ends.
- Rate-limit failed join attempts (for example 5 per minute per IP and per account) so codes cannot be brute-forced.
- Never reveal whether a wrong code "almost" exists. Same error for expired and nonexistent.

## 6. Bots

Live in `packages/shared/src/bot/` as pure functions, for example `chooseMove(state, difficulty, rng)`. They run on-device, offline.

- Easy: random legal move, slightly prefers line clears.
- Medium: greedy heuristic (lines cleared, fewer holes, less fragmentation, attack potential).
- Hard: tries all orderings of the 3-piece tray with the same heuristic, plus a defensive bias when the board is crowded.
- Add human-like delays (roughly 0.8 to 2.5 seconds per move). Bots only see what a human sees.

## 7. Accounts, profiles, friends

- **Guest first:** the player can start immediately as a guest. Offer to create an account (email or Google) later so progress is kept.
- **Profile:** unique handle, display name, avatar from a preset set, stats (matches, wins, streak, rating).
- **Friends:** add by handle or friend code. Request, accept, block. Presence: online, in match, offline.
- **Invite to duel:** server creates a room and pushes an invite to the friend. A non-friend can still join with the 6-digit code.
- Basics: name filter, report and block. Collect the minimum data. A privacy policy is needed for the Play Store. Ask the user about target age rating (Q5) before building anything that stores personal data.

## 8. Assets (already in `assets/`, do not invent replacements)

Source of truth lives in `assets/`. Do not edit the originals. Copy or pack what the game needs into the client build with a script, and keep every `License.txt` / `OFL.txt`.

```
assets/
  fonts/titan-one/   assets/fonts/nunito/
  sfx/kenney-interface/Audio  sfx/kenney-digital/Audio  sfx/kenney-impact/Audio  sfx/kenney-jingles/Audio
  ui/kenney-ui-pack/  ui/kenney-game-icons/
  textures/
```

- **Fonts:** Titan One for big text (scores, titles, "COMBO!", "VS"). Nunito for UI text. No other fonts.
- **Block textures** (`assets/textures/blocks/<color>/`): 8 colors, 16 variants each, 128x128 PNG. Filename suffix lists which sides are connected to another cell **of the same piece** (N E S W order), `single` if none. Connect by piece id, never by color.
  ```ts
  function blockKey(color: string, n: boolean, e: boolean, s: boolean, w: boolean) {
    const t = (n ? 'N' : '') + (e ? 'E' : '') + (s ? 'S' : '') + (w ? 'W' : '');
    return `block_${color}_${t || 'single'}`;
  }
  ```
  Other textures: `cell_empty`, `block_garbage`, `block_flash`, `fx_sparkle`, `fx_dot` (white, tint in code). Placement ghost = normal block textures at about 40% alpha. Pack the block textures into one atlas for performance.
- **SFX:** all in one config file `apps/client/src/audio/sfx-map.ts` mapping event name to file, so the user can swap sounds without touching game code. First picks, the user may change them:

  | Event                                 | File                                    |
  | ------------------------------------- | --------------------------------------- |
  | ui_click                              | kenney-interface/click_001              |
  | ui_back                               | kenney-interface/back_001               |
  | piece_pickup                          | kenney-interface/select_001             |
  | piece_place                           | kenney-impact/impactSoft_medium_000     |
  | piece_invalid                         | kenney-interface/error_001              |
  | line_clear                            | kenney-digital/pepSound1                |
  | big_clear (3+ lines)                  | kenney-digital/powerUp5                 |
  | combo (pitch up per level in code)    | kenney-digital/phaserUp1                |
  | attack_send                           | kenney-digital/laser1                   |
  | attack_receive                        | kenney-impact/impactPunch_heavy_000     |
  | garbage_land                          | kenney-impact/impactPlate_heavy_000     |
  | countdown_tick                        | kenney-interface/tick_001               |
  | countdown_go                          | kenney-interface/confirmation_003       |
  | match_found                           | kenney-interface/confirmation_001       |
  | time_warning                          | kenney-interface/tick_002               |
  | defeat, game_over                     | kenney-digital/lowDown                  |
  | victory, perfect_clear, new_highscore | TBD, user will pick from kenney-jingles |

- **Music:** background track not chosen yet. Build a music player with a placeholder slot and mute/volume settings.
- Audio format is `.ogg`.

## 9. UI and feel

- Style: cartoony, chill, soft, rounded. Never harsh or "serious".
- Phones: portrait. Your board large, opponent's board as a small live mini-board at the top. PC and TV: landscape, two boards side by side. Use responsive scaling.
- Input: touch and mouse drag. While dragging, lift the piece above the finger so it stays visible. Show a ghost preview and snap to the grid. Keyboard and gamepad support for TV comes later.
- Screens: Splash, Main Menu (Play Online, Play vs Bot, Offline Duel, Friends, Profile, Settings), Lobby (shows code), Match, Result.
- Juice: squash and pop on place, sparkles on clear, small screen shake when hit by garbage, pulsing "COMBO!" text. Keep each animation under about 400 ms so it never blocks play.
- Settings: music and SFX volume, reduce motion. Plan for a colorblind-friendly option later.

## 10. Build phases (do them in order, stop for review between phases)

0. Scaffold the monorepo, lint, test, Vite + Phaser hello world, Capacitor not yet.
1. `shared` game core with unit tests: board, piece set, seeded PRNG, placement validation, line clear, scoring and combos, garbage and attack, game-over check.
2. Bot Versus playable in the browser: gameplay scene, drag and drop, textures, SFX, three bot difficulties, result screen.
3. Game server: rooms, 6-digit codes, authoritative validation, reconnect. Private Duel online.
4. Accounts, profiles, friends, invites, Quick Match queue, rating.
5. Offline Versus (Variant A, then B if wanted).
6. Android APK with Capacitor, polish, store requirements.

## 11. Rules for working

1. Small steps. Commit after each working step with a clear message.
2. `packages/shared` is pure and deterministic and fully unit-tested. No Phaser or DOM imports there.
3. Never trust the client. Validate everything on the server.
4. No secrets in the repo. Use `.env` and keep a `.env.example`.
5. Do not add a dependency without saying why. Prefer well-known, maintained ones.
6. Do not edit originals in `assets/`. Do not invent or download replacement assets. If something is missing, list it and ask.
7. Target 60 fps on a mid-range Android phone. Keep the web build small, use an atlas for textures.
8. Log every real decision in `DECISIONS.md` (one short entry each).
9. The user is a beginner with servers and multiplayer. Explain decisions in plain words, and give exact commands to run things.
10. Choose sensible defaults for small things and log them. Ask the user only when a decision is expensive to undo.
11. A feature is done when it works, has tests where it can, and the run instructions in this file are still correct.

## 12. Open questions (ask the user, do not guess)

- **Q1.** Where to host the game server and web client, and what is the monthly budget? (A free tier is fine to start.)
- **Q2.** Supabase or Firebase for accounts, profiles, friends?
- **Q3.** ANSWERED: two devices on the same Wi-Fi. LAN duel is in the Android app. A browser tab cannot open a LAN socket, so the web build shows an explanation instead.
- **Q4.** Win condition and match length: pure survival, best of 3, or timed rounds?
- **Q5.** Target stores and age rating (Google Play only? iOS needs a Mac)?
- **Q6.** Monetization plans (ads, purchases, none)? It affects architecture later.
