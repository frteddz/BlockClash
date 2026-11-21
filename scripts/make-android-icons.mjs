/**
 * Turns the supplied mobile icon into every Android launcher image.
 * The source file in assets/logo is never modified.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets/logo/icon_1024-mobile.png');
const resDir = path.join(root, 'apps/client/android/app/src/main/res');

const densities = [
  { name: 'mdpi', launcher: 48, foreground: 108 },
  { name: 'hdpi', launcher: 72, foreground: 162 },
  { name: 'xhdpi', launcher: 96, foreground: 216 },
  { name: 'xxhdpi', launcher: 144, foreground: 324 },
  { name: 'xxxhdpi', launcher: 192, foreground: 432 },
];

async function rounded(input, size) {
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  return sharp(input).resize(size, size).composite([{ input: circle, blend: 'dest-in' }]).png().toBuffer();
}

async function main() {
  for (const density of densities) {
    const dir = path.join(resDir, `mipmap-${density.name}`);
    await mkdir(dir, { recursive: true });
    const base = await sharp(source).resize(density.launcher, density.launcher).png().toBuffer();
    await writeFile(path.join(dir, 'ic_launcher.png'), base);
    await writeFile(path.join(dir, 'ic_launcher_round.png'), await rounded(base, density.launcher));
    const foreground = await sharp(source)
      .resize(density.foreground, density.foreground)
      .png()
      .toBuffer();
    await writeFile(path.join(dir, 'ic_launcher_foreground.png'), foreground);
  }
  console.log(`icons: wrote launcher images for ${densities.length} Android densities.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
