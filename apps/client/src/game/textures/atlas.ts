export const BLOCKS_TEXTURE = 'blocks';

let frames: Record<string, number> = {};

export function setAtlasFrames(data: { frames: Record<string, number> }): void {
  frames = data.frames;
}

export function frameFor(name: string): number {
  return frames[name] ?? 0;
}
