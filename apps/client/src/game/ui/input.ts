import Phaser from 'phaser';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point2 {
  x: number;
  y: number;
}

const supportsPointer = typeof window !== 'undefined' && 'onpointerdown' in window;

function clientCoords(event: Event): Point2 {
  if ('changedTouches' in event) {
    const touch = (event as TouchEvent).changedTouches[0];
    if (touch !== undefined) return { x: touch.clientX, y: touch.clientY };
  }
  if ('touches' in event) {
    const touch = (event as TouchEvent).touches[0];
    if (touch !== undefined) return { x: touch.clientX, y: touch.clientY };
  }
  const mouse = event as MouseEvent;
  return { x: mouse.clientX, y: mouse.clientY };
}

/** Converts a browser event position into Phaser game coordinates. */
export function gamePoint(scene: Phaser.Scene, event: Event): Point2 {
  const bounds = scene.game.canvas.getBoundingClientRect();
  const point = clientCoords(event);
  return {
    x: (point.x - bounds.left) * (scene.scale.displayScale.x || 1),
    y: (point.y - bounds.top) * (scene.scale.displayScale.y || 1),
  };
}

export function inside(point: Point2, rect: Rect): boolean {
  return (
    point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h
  );
}

/**
 * Native pointer events on the canvas. Phaser's game-object hit testing has
 * proved unreliable for some browsers and touch WebViews, so interactive UI
 * uses these directly instead.
 */
export function onCanvasPointer(
  scene: Phaser.Scene,
  kind: 'down' | 'move' | 'up',
  handler: (point: Point2) => void,
): void {
  const canvas = scene.game.canvas;
  const names =
    kind === 'down'
      ? supportsPointer
        ? ['pointerdown']
        : ['touchstart', 'mousedown']
      : kind === 'move'
        ? supportsPointer
          ? ['pointermove']
          : ['touchmove', 'mousemove']
        : supportsPointer
          ? ['pointerup', 'pointercancel']
          : ['touchend', 'touchcancel', 'mouseup'];

  const listener = (event: Event): void => {
    handler(gamePoint(scene, event));
  };
  for (const name of names) canvas.addEventListener(name, listener, { passive: true });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    for (const name of names) canvas.removeEventListener(name, listener);
    canvas.style.cursor = '';
  });
}
