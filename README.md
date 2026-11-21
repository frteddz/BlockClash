# BlockClash

A cartoony, chill, head-to-head block puzzle game. Every match is versus - there is no
single-player mode. The web build runs at https://frteddz.github.io/BlockClash/.

The v1 Android APK is on the [releases page](https://github.com/frteddz/BlockClash/releases/tag/v1.0.0).

Read `AGENTS.md` for the full game design and `DECISIONS.md` for the choices made so far.

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer (`corepack enable` if `pnpm` is missing)
- For the APK only: Android SDK platform 36, build-tools 36, and JDK 17 or 21

## Commands

```bash
pnpm install     # install all workspace packages (run once, and after changing deps)
pnpm dev         # copy assets + start the web game locally
pnpm test        # run the shared-core unit tests
pnpm build       # copy assets + typecheck + build the web game into apps/client/dist
pnpm lint
pnpm format
```

### Android APK

```bash
pnpm build:apk   # builds web, syncs Capacitor, writes BlockClash-v1.apk to the repo root
```

The build script reads `ANDROID_HOME` and `BUILD_JAVA_HOME` from the environment, so set those
if your SDK or JDK is somewhere unusual. On this machine the working values were:

```bash
ANDROID_HOME=/tmp/opencode/android-sdk \
BUILD_JAVA_HOME=/home/teddz/.sdkman/candidates/java/21.0.12-amzn \
pnpm build:apk
```

Launcher icons come from `assets/logo/icon_1024-mobile.png` through `scripts/make-android-icons.mjs`.
The original file is never edited.

### Hosting

Pushes to `master` run `.github/workflows/deploy.yml`, which builds the web game and publishes it
to GitHub Pages. The first build may take a minute to appear.

Online play, accounts, friends and offline versus are not built yet.
