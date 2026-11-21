# BlockClash decisions log

One short entry per real decision. Keep this up to date with `AGENTS.md`.

- **D001 (Phase 0):** Initialised git in a repo that had none. pnpm workspaces, TypeScript strict, ESLint flat config, Prettier, Vitest, Vite + Phaser 3. Capacitor waits until Phase 6.
- **D002 (Phase 0):** Block textures are packed at build time into one 128px-cell sprite sheet (`blocks-atlas.png` + `blocks-atlas.json`) by `scripts/copy-assets.mjs`. Added `sharp` for this because it is the standard compositing library and 128 separate image requests on a phone is silly. Originals in `assets/` are never edited.
- **D003 (Phase 0):** `packages/shared` exports its TypeScript source directly so the client and tests work without a build step. `pnpm build` still emits `dist/` for later Node consumers.
- **D004 (Phase 1):** Win condition is pure survival for Phases 1 and 2, as `AGENTS.md` says to start there. Q4 stays open for best-of-three or timed rounds.
- **D005 (Phase 2):** The supplied music file is `velariomusic-upbeat-chill-613805.mp3`. It is the main theme and loops in menus and matches, with an on/off button on the home menu. It is `.mp3`, not `.ogg` like the SFX. Phaser handles both, so no conversion.
- **D006 (Phase 2):** No license file was supplied for the music track. I am not inventing one. Confirm before a store release.
- **D007 (Phase 2):** The three jingle SFX left as TBD in `AGENTS.md` use temporary picks in `sfx-map.ts`: victory is 8-bit NES08, perfect_clear is Pizzicato16, new_highscore is Steel16. Swappable in one file.
- **D008 (Phase 2):** Layout uses Phaser RESIZE mode and is computed at runtime, so phones get portrait with the opponent mini-board on top, and PC/TV get landscape with two boards side by side.
- **D009 (Phase 0):** TypeScript `strict: true` is the enforced level. Extra pedantic flags are off to keep the code readable.
- **D010 (Phase 2):** A `window.__blockclash` game reference is exposed only in dev builds for browser debugging. Production builds strip it via `import.meta.env.DEV`.
- **D011 (Phase 2):** Verified in a real browser at 976x727 landscape and 390x844 portrait. The tray is sized before the boards in the layout math so it never covers the bottom row.
- **D012 (user):** Q1 answered: host the web game on GitHub Pages under `frteddz.github.io/BlockClash`. A GitHub Actions workflow builds and deploys on every push to master.
- **D013 (user):** Q2 answered with "no need for accounts for now". Phase 4 accounts, profiles, friends and rating are off the table. Online play, if built later, must work for guests.
- **D014 (user):** The Android app icon is `assets/logo/icon_1024-mobile.png`. It is copied into the Capacitor Android mipmaps by a script. The original is never edited.
- **D015 (user):** The first Android build is called BlockClash v1, version 1.0.0, application id `com.blockclash.game`.
- **D016 (bug fix):** Buttons and tray pickups now use native pointer listeners on the canvas instead of Phaser game-object hit testing. Phaser's hit testing was unreliable for real mouse and touch input even though synthetic events worked in tests.
- **D017 (bug fix):** The game buffer is rendered at up to 2x device pixel ratio and zoomed back to CSS size, so phones get sharp text and blocks. Menus are rebuilt on resize because they lay out only once in `create()`.
- **D018 (user):** Q3 answered. Offline versus means two devices on the same WiFi. Built for the Android APK only, because a browser page cannot open a LAN socket. The web menu explains this.
- **D019 (Phase 5):** LAN transport lives in a small Capacitor plugin. The host phone advertises `_blockclash._tcp` with Android network discovery and a 6-digit code, and hosts a WebSocket socket. The host app runs the authoritative shared game core and sends state to the guest. Added `org.java-websocket:Java-WebSocket` for the socket because writing framing by hand is not worth the bugs.
- **D020 (Phase 5):** LAN mode uses its own match scene so the working bot mode stays untouched. There is no manual code entry yet. The code is shown on each discovered device so players can confirm they joined the right one.
