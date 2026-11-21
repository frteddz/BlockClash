/**
 * Copies the assets the game needs from the read-only `assets/` folder into
 * `apps/client/public/assets/`, and builds one block atlas sprite sheet.
 *
 * Never edit anything in `assets/` - it is the source of truth.
 * Run with: pnpm assets  (the dev/build scripts call this for you)
 */
import { cp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets');
const output = path.join(root, 'apps/client/public/assets');
const TILE = 128;

const colors = ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow'];

// Same N E S W bit order used by blockKey() in the shared game core.
function suffixes() {
  const result = [];
  for (let mask = 0; mask < 16; mask += 1) {
    let text = '';
    if (mask & 1) text += 'N';
    if (mask & 2) text += 'E';
    if (mask & 4) text += 'S';
    if (mask & 8) text += 'W';
    result.push(text || 'single');
  }
  return result;
}

async function copy(relativeSource, relativeTarget) {
  await cp(path.join(source, relativeSource), path.join(output, relativeTarget), {
    recursive: true,
  });
}

async function main() {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  // ---- Fonts -------------------------------------------------------------
  await copy('fonts/titan-one/TitanOne-Regular.ttf', 'fonts/TitanOne-Regular.ttf');
  await copy('fonts/titan-one/OFL.txt', 'fonts/titan-one-OFL.txt');
  await copy('fonts/nunito/static/Nunito-Regular.ttf', 'fonts/Nunito-Regular.ttf');
  await copy('fonts/nunito/static/Nunito-Bold.ttf', 'fonts/Nunito-Bold.ttf');
  await copy('fonts/nunito/OFL.txt', 'fonts/nunito-OFL.txt');

  // ---- Sound effects (all .ogg) ------------------------------------------
  const sfx = [
    'sfx/kenney-interface/Audio/click_001.ogg',
    'sfx/kenney-interface/Audio/back_001.ogg',
    'sfx/kenney-interface/Audio/select_001.ogg',
    'sfx/kenney-interface/Audio/error_001.ogg',
    'sfx/kenney-interface/Audio/tick_001.ogg',
    'sfx/kenney-interface/Audio/tick_002.ogg',
    'sfx/kenney-interface/Audio/confirmation_001.ogg',
    'sfx/kenney-interface/Audio/confirmation_003.ogg',
    'sfx/kenney-impact/Audio/impactSoft_medium_000.ogg',
    'sfx/kenney-impact/Audio/impactPunch_heavy_000.ogg',
    'sfx/kenney-impact/Audio/impactPlate_heavy_000.ogg',
    'sfx/kenney-digital/Audio/pepSound1.ogg',
    'sfx/kenney-digital/Audio/powerUp5.ogg',
    'sfx/kenney-digital/Audio/phaserUp1.ogg',
    'sfx/kenney-digital/Audio/laser1.ogg',
    'sfx/kenney-digital/Audio/lowDown.ogg',
    'sfx/kenney-jingles/Audio/8-Bit jingles/jingles_NES08.ogg',
    'sfx/kenney-jingles/Audio/Pizzicato jingles/jingles_PIZZI16.ogg',
    'sfx/kenney-jingles/Audio/Steel jingles/jingles_STEEL16.ogg',
  ];
  for (const file of sfx) {
    await copy(file, `sfx/${path.basename(file)}`);
  }
  for (const pack of ['kenney-interface', 'kenney-digital', 'kenney-impact', 'kenney-jingles']) {
    await copy(`sfx/${pack}/License.txt`, `sfx/${pack}-License.txt`);
  }

  // ---- Main music (the one supplied by the user, an .mp3) ----------------
  await copy('music/velariomusic-upbeat-chill-613805.mp3', 'music/main-theme.mp3');

  // ---- App icon ----------------------------------------------------------
  await copy('logo/icon_1024-mobile.png', 'icon.png');

  // ---- UI ----------------------------------------------------------------
  await copy('ui/kenney-game-icons/PNG/White/1x/audioOn.png', 'ui/audioOn.png');
  await copy('ui/kenney-game-icons/PNG/White/1x/audioOff.png', 'ui/audioOff.png');
  await copy('ui/kenney-ui-pack/License.txt', 'ui/kenney-ui-pack-License.txt');
  await copy('ui/kenney-game-icons/license.txt', 'ui/kenney-game-icons-license.txt');
  await copy('textures/README.txt', 'textures/README.txt');

  // ---- One block atlas ----------------------------------------------------
  const frames = [];
  for (const color of colors) {
    for (const suffix of suffixes()) {
      const name = `block_${color}_${suffix}`;
      frames.push({ name, input: path.join(source, 'textures/blocks', color, `${name}.png`) });
    }
  }
  for (const name of ['cell_empty', 'block_garbage', 'block_flash', 'fx_sparkle', 'fx_dot']) {
    frames.push({ name, input: path.join(source, 'textures', `${name}.png`) });
  }

  const columns = 16;
  const rows = Math.ceil(frames.length / columns);
  const sheet = await sharp({
    create: {
      width: columns * TILE,
      height: rows * TILE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      frames.map((frame, index) => ({
        input: frame.input,
        left: (index % columns) * TILE,
        top: Math.floor(index / columns) * TILE,
      })),
    )
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(path.join(output, 'textures/blocks-atlas.png'), sheet);
  await writeFile(
    path.join(output, 'textures/blocks-atlas.json'),
    JSON.stringify(
      {
        frameSize: TILE,
        columns,
        rows,
        frames: Object.fromEntries(frames.map((frame, index) => [frame.name, index])),
      },
      null,
      2,
    ) + '\n',
  );

  console.log(
    `assets: copied fonts, sfx, music and UI; built block atlas with ${frames.length} frames ` +
      `(${columns * TILE}x${rows * TILE}).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
