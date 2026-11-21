BlockClash connected block textures (128x128 PNG, transparent)

Each colour has 16 variants. The file suffix lists which sides are CONNECTED
to another cell of the SAME PIECE (not just the same colour), in the order N E S W:

  single   no neighbours          E     joins east (left end of a bar)
  EW       middle of a bar        W     joins west (right end of a bar)
  NS       middle of a tall bar   N / S top / bottom end of a tall bar
  NESW     fully surrounded       ... and every other combination

Picking the texture (TypeScript):

  function blockKey(color: string, n: boolean, e: boolean, s: boolean, w: boolean) {
    const t = (n ? 'N' : '') + (e ? 'E' : '') + (s ? 'S' : '') + (w ? 'W' : '');
    return `block_${color}_${t || 'single'}`;
  }
  // n/e/s/w = neighbour cell belongs to the same piece id

Connect by piece id, not by colour: two separate red pieces next to each
other should stay visually separate.

Extras: cell_empty (grid slot), block_garbage (versus attack row, single only),
block_flash (line-clear flash), fx_sparkle, fx_dot (white, tint in code).
For the placement ghost, draw the normal block textures at about 40% alpha.
Files starting with _ are previews only; do not ship them in the game.
