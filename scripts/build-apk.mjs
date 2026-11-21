/**
 * Builds BlockClash v1 as an installable Android APK.
 * Needs the Android SDK and JDK 17 or 21. Override ANDROID_HOME and
 * BUILD_JAVA_HOME in the environment if they are not already set up.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = path.join(root, 'apps/client/android');
const apkSource = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
const apkTarget = path.join(root, 'BlockClash-v1.apk');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  run('pnpm', ['build']);
  run('pnpm', ['--filter', '@blockclash/client', 'exec', 'cap', 'sync', 'android']);
  run('node', ['scripts/make-android-icons.mjs']);

  const androidHome = process.env.ANDROID_HOME ?? '/usr/lib/android-sdk';
  const javaHome = process.env.BUILD_JAVA_HOME ?? process.env.JAVA_HOME;
  const env = {
    ANDROID_HOME: androidHome,
    ANDROID_SDK_ROOT: androidHome,
    ...(javaHome !== undefined ? { JAVA_HOME: javaHome } : {}),
  };
  const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  run(gradle, ['assembleDebug'], { cwd: androidDir, env });

  if (!existsSync(apkSource)) throw new Error(`APK was not produced at ${apkSource}`);
  mkdirSync(path.dirname(apkTarget), { recursive: true });
  copyFileSync(apkSource, apkTarget);
  console.log(`APK ready: ${apkTarget}`);
}

main();
