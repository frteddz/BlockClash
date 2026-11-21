# BlockClash

A cartoony, chill, head-to-head block puzzle game. Every match is versus - there is no
single-player mode. One codebase ships as a web app and (later) an Android APK.

Read `AGENTS.md` for the full game design and `DECISIONS.md` for the choices made so far.

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer (`corepack enable` if `pnpm` is missing)

## Commands

See the "Commands" section of `AGENTS.md` for the authoritative list. The short version:

```bash
pnpm install     # install all workspace packages (run once, and after changing deps)
pnpm dev         # copy assets + start the web game at http://localhost:5173
pnpm test        # run the shared-core unit tests
pnpm build       # copy assets + typecheck + build the web game into apps/client/dist
```

Online play, accounts and Android packaging arrive in later phases.
