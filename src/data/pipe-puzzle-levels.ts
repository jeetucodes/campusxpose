// ─── Pipe Connect Level Data ──────────────────────────────────────────────────
// Each level is a grid of 2-char tile codes:
//   Type chars: S=Source, D=Device, ─=Straight, L=Elbow, T=T-junction, +=Cross,
//               X=Blocked, !=Overload, .=Empty
//   Rotation digit: 0=0°, 1=90°, 2=180°, 3=270° (clockwise)
//
// CONNECTION LOGIC — getConnections right-rotates [top,right,bottom,left]:
//   straight: rot0=[T,F,T,F] rot1=[F,T,F,T]
//   elbow:    rot0=[T,T,F,F] rot1=[F,T,T,F] rot2=[F,F,T,T] rot3=[T,F,F,T]
//   t-junc:   rot0=[T,T,F,T] rot1=[T,T,T,F] rot2=[F,T,T,T] rot3=[T,F,T,T]
//   cross:    all rotations=[T,T,T,T]
//   source:   rot0=emitsB  rot1=emitsL  rot2=emitsT  rot3=emitsR
//   device:   rot0=receivesT  rot1=receivesL  rot2=receivesB  rot3=receivesR
//
// All 50 levels below are verified solvable: every device is reachable from
// its source(s) using the tiles' SOLVED rotation, no solution path routes
// through an overload tile, and maxMoves is guaranteed >= the exact number
// of taps required by this level's seeded tile scramble (see getPipeLevel).

export type PipeTileType = "straight" | "elbow" | "t-junction" | "cross" | "source" | "device" | "blocked" | "overload" | "empty";

export interface PipeTile {
  row: number;
  col: number;
  type: PipeTileType;
  rotation: number;       // 0-3 (current rotation, player can change for non-fixed)
  solvedRotation: number; // the correct rotation for the solution
  fixed: boolean;         // source, device, blocked, overload cannot be rotated
}

export interface PipeLevelData {
  gridSize: number;
  tiles: PipeTile[];
  maxMoves: number;
}

// Connection definitions per tile type at rotation=0
// [top, right, bottom, left]
export const BASE_CONNECTIONS: Record<PipeTileType, [boolean, boolean, boolean, boolean]> = {
  straight: [true, false, true, false],   // vertical pipe
  elbow: [true, true, false, false],       // top-right corner
  "t-junction": [true, true, false, true], // top, right, left (no bottom)
  cross: [true, true, true, true],         // all four
  source: [false, false, true, false],     // emits downward at rot=0
  device: [true, false, false, false],     // receives from top at rot=0
  blocked: [false, false, false, false],
  overload: [true, true, true, true],      // connects all sides (it's a trap)
  empty: [false, false, false, false],
};

export function getConnections(type: PipeTileType, rotation: number): [boolean, boolean, boolean, boolean] {
  const base = BASE_CONNECTIONS[type];
  if (!base) return [false, false, false, false];
  const r = ((rotation % 4) + 4) % 4;
  const result: [boolean, boolean, boolean, boolean] = [...base];
  for (let i = 0; i < r; i++) {
    const last = result.pop()!;
    result.unshift(last);
  }
  return result;
}

// ─── Raw Level Definitions ────────────────────────────────────────────────────
// Grid format: array of rows, each row is array of 2-char codes.
// The rotation digit is the SOLVED rotation; getPipeLevel() scrambles non-fixed
// tiles on load using a seeded RNG (seed = (levelIndex + 1) * 777), so the
// scramble is deterministic per level, not random per play session.

interface RawLevel {
  grid: string[][];
  maxMoves: number;
}

const RAW_LEVELS: RawLevel[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: TUTORIAL (Levels 1–8)
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 1: 4x4, 1→1
  {
    grid: [
      ["S0", "..", "..", ".."],
      ["─0", "..", "..", ".."],
      ["─0", "..", "..", ".."],
      ["D0", "..", "..", ".."],
    ],
    maxMoves: 9,
  },

  // Level 2: 4x4, 1→1
  {
    grid: [
      ["..", "..", "..", ".."],
      ["S3", "─1", "─1", "D3"],
      ["..", "..", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 8,
  },

  // Level 3: 4x4, 1→1
  {
    grid: [
      ["S0", "..", "..", ".."],
      ["L0", "─1", "D3", ".."],
      ["..", "..", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 9,
  },

  // Level 4: 4x4, 1→1
  {
    grid: [
      ["..", "S0", "..", ".."],
      ["..", "─0", "..", ".."],
      ["..", "L0", "D3", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 9,
  },

  // Level 5: 4x4, 1→1
  {
    grid: [
      ["S0", "..", "D2", ".."],
      ["L0", "─1", "L3", ".."],
      ["..", "..", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 6: 4x4, 1→1
  {
    grid: [
      ["..", "S0", "..", ".."],
      ["..", "─0", "..", ".."],
      ["..", "L0", "─1", "D3"],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 7: 4x4, 1→1
  {
    grid: [
      ["S0", "..", "..", ".."],
      ["─0", "D2", "..", ".."],
      ["L0", "L3", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 8: 4x4, 1→1
  {
    grid: [
      ["S0", "..", "..", "D2"],
      ["─0", "..", "..", "─0"],
      ["─0", "..", "..", "─0"],
      ["L0", "─1", "─1", "L3"],
    ],
    maxMoves: 18,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: EASY-MEDIUM (Levels 9–18)
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 9: 4x4, 1→2, T-junction
  {
    grid: [
      ["..", "S0", "..", ".."],
      ["..", "T1", "D3", ".."],
      ["..", "D0", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 9,
  },

  // Level 10: 4x4, 1→2, T-junction
  {
    grid: [
      ["..", "..", "S0", ".."],
      ["..", "..", "─0", ".."],
      ["..", "..", "T1", "D3"],
      ["..", "..", "D0", ".."],
    ],
    maxMoves: 10,
  },

  // Level 11: 4x4, 1→1, 1 blocked
  {
    grid: [
      ["S0", "..", "..", ".."],
      ["─0", "X0", "D2", ".."],
      ["L0", "─1", "L3", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 12: 5x5, 1→1, 2 blocked
  {
    grid: [
      ["S0", "..", "..", "..", ".."],
      ["─0", "..", "X0", "..", ".."],
      ["─0", "..", "X0", "..", ".."],
      ["L0", "─1", "─1", "─1", "D3"],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 15,
  },

  // Level 13: 5x5, 1→2, 2 blocked, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "..", "─0", "..", ".."],
      ["X0", "X0", "T1", "─1", "D3"],
      ["..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 14: 5x5, 1→1, 4 blocked
  {
    grid: [
      ["S3", "─1", "L2", "..", ".."],
      ["X0", "X0", "─0", "..", ".."],
      ["X0", "X0", "─0", "..", ".."],
      ["..", "..", "L0", "─1", "D3"],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 14,
  },

  // Level 15: 5x5, 1→2, 2 blocked, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "..", "─0", "..", ".."],
      ["X0", "X0", "T1", "─1", "D3"],
      ["..", "..", "─0", "..", ".."],
      ["..", "..", "D0", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 16: 5x5, 1→1, 2 blocked
  {
    grid: [
      ["S0", "..", "..", "..", ".."],
      ["─0", "..", "..", "D2", ".."],
      ["L0", "─1", "─1", "L3", ".."],
      ["..", "..", "X0", "..", ".."],
      ["..", "..", "X0", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 17: 5x5, 1→2, T-junction
  {
    grid: [
      ["..", "S0", "..", "..", ".."],
      ["..", "T1", "L2", "..", ".."],
      ["..", "─0", "D0", "..", ".."],
      ["..", "D0", "..", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 18: 5x5, 1→2, 3 blocked, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "X0", "─0", "X0", ".."],
      ["..", "X0", "T1", "─1", "D3"],
      ["..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: MEDIUM (Levels 19–30)
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 19: 5x5, 1→2, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "..", "T1", "D3", ".."],
      ["..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 9,
  },

  // Level 20: 5x5, 1→1, T-junction
  {
    grid: [
      ["..", "S0", "..", "..", ".."],
      ["..", "T1", "..", "..", ".."],
      ["..", "─0", "..", "..", ".."],
      ["..", "L0", "D3", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 21: 5x5, 1→1, 1 overload
  {
    grid: [
      ["S0", "..", "..", "..", ".."],
      ["─0", "..", "!0", "D2", ".."],
      ["L0", "─1", "─1", "L3", ".."],
      ["..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 22: 5x5, 1→1, 1 overload
  {
    grid: [
      ["S0", "..", "D2", "..", ".."],
      ["L0", "─1", "L3", "!0", ".."],
      ["..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 23: 5x5, 1→2, 1 overload, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "..", "T1", "─1", "D3"],
      ["..", "..", "─0", "!0", ".."],
      ["..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 24: 5x5, 1→1, 2 overload
  {
    grid: [
      ["S3", "L2", "..", "..", ".."],
      ["..", "─0", "..", "!0", ".."],
      ["..", "─0", "..", "!0", ".."],
      ["..", "L0", "─1", "─1", "D3"],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 25: 5x5, 1→2, 2 overload, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "..", "T1", "─1", "D3"],
      ["!0", "..", "─0", "..", "!0"],
      ["..", "..", "L0", "─1", "D3"],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 26: 5x5, 1→2, 2 blocked, T-junction
  {
    grid: [
      ["S3", "─1", "L2", "..", ".."],
      ["..", "X0", "─0", "..", ".."],
      ["..", "X0", "T1", "─1", "D3"],
      ["..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 27: 5x5, 1→2, 2 overload, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "!0", "─0", "!0", ".."],
      ["..", "..", "T1", "─1", "D3"],
      ["..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 28: 5x5, 1→2, T-junction
  {
    grid: [
      ["..", "..", "..", "..", ".."],
      ["..", "..", "D2", "..", ".."],
      ["S3", "─1", "T0", "─1", "D3"],
      ["..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 29: 5x5, 1→2, 3 blocked, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "X0", "─0", "X0", ".."],
      ["D1", "─1", "T0", "─1", "D3"],
      ["..", "..", "X0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 30: 5x5, 1→2, 1 overload, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "..", "T1", "─1", "D3"],
      ["!0", "..", "─0", "..", ".."],
      ["..", "..", "L0", "─1", "D3"],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: HARD (Levels 31–40)
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 31: 6x6, 1→2, T-junction
  {
    grid: [
      ["..", "S0", "..", "..", "D2", ".."],
      ["..", "─0", "..", "..", "─0", ".."],
      ["..", "T1", "─1", "─1", "L3", ".."],
      ["..", "L0", "─1", "D3", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 24,
  },

  // Level 32: 6x6, 1→2, 5 blocked, T-junction
  {
    grid: [
      ["S3", "─1", "L2", "..", "..", ".."],
      ["X0", "X0", "─0", "..", "..", ".."],
      ["X0", "X0", "─0", "..", "..", ".."],
      ["..", "X0", "T1", "─1", "D3", ".."],
      ["..", "..", "D0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 14,
  },

  // Level 33: 6x6, 1→1, 1 blocked, 2 overload
  {
    grid: [
      ["..", "..", "S0", "..", "D2", ".."],
      ["..", "!0", "─0", "!0", "─0", ".."],
      ["..", "..", "L0", "─1", "L3", ".."],
      ["..", "..", "..", "X0", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 34: 6x6, 1→2, T-junction
  {
    grid: [
      ["..", "..", "..", "S0", "..", ".."],
      ["..", "..", "..", "T1", "─1", "D3"],
      ["..", "..", "..", "L0", "D3", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 35: 6x6, 1→1, 4 blocked
  {
    grid: [
      ["S0", "..", "..", "D2", "..", ".."],
      ["─0", "X0", "X0", "─0", "..", ".."],
      ["─0", "X0", "X0", "─0", "..", ".."],
      ["L0", "─1", "─1", "L3", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 17,
  },

  // Level 36: 6x6, 2→2
  {
    grid: [
      ["S3", "─1", "D3", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "S3", "─1", "─1", "D3"],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 9,
  },

  // Level 37: 6x6, 2→2
  {
    grid: [
      ["S0", "..", "..", "..", "..", ".."],
      ["─0", "..", "..", "..", "..", ".."],
      ["L0", "─1", "D3", "..", "..", ".."],
      ["..", "..", "..", "..", "S3", "D3"],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 38: 6x6, 1→1, 2 blocked, 1 overload
  {
    grid: [
      ["..", "S0", "..", "..", "D2", ".."],
      ["..", "─0", "!0", "X0", "─0", ".."],
      ["..", "L0", "─1", "─1", "L3", ".."],
      ["..", "..", "..", "X0", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 39: 6x6, 2→2, 3 blocked
  {
    grid: [
      ["S0", "..", "..", "..", "..", ".."],
      ["─0", "X0", "..", "..", "..", ".."],
      ["L0", "─1", "─1", "D3", "X0", ".."],
      ["..", "X0", "..", "S0", "..", ".."],
      ["..", "..", "..", "─0", "..", ".."],
      ["..", "..", "..", "L0", "─1", "D3"],
    ],
    maxMoves: 17,
  },

  // Level 40: 6x6, 2→3, 2 blocked, 1 overload, T-junction
  {
    grid: [
      ["..", "S0", "..", "..", "S0", ".."],
      ["..", "T1", "─1", "D3", "L0", "D3"],
      ["..", "─0", "..", "!0", "..", ".."],
      ["..", "L0", "─1", "D3", "..", ".."],
      ["..", "..", "X0", "X0", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 14,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: EXPERT (Levels 41–50)
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 41: 6x6, 1→3, cross tile, T-junction
  {
    grid: [
      ["..", "..", "S0", "..", "..", ".."],
      ["..", "..", "─0", "..", "..", ".."],
      ["..", "..", "T1", "+0", "─1", "D3"],
      ["..", "..", "D0", "D0", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 42: 6x6, 1→2, 2 overload, cross tile
  {
    grid: [
      ["..", "..", "S0", "..", "..", ".."],
      ["..", "!0", "─0", "!0", "..", ".."],
      ["..", "..", "+0", "─1", "D3", ".."],
      ["..", "..", "─0", "..", "..", ".."],
      ["..", "..", "D0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 43: 6x6, 1→3, cross tile
  {
    grid: [
      ["..", "..", "..", "D2", "..", ".."],
      ["..", "..", "..", "─0", "..", ".."],
      ["S3", "─1", "─1", "+0", "─1", "D3"],
      ["..", "..", "..", "─0", "..", ".."],
      ["..", "..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 44: 6x6, 1→2, 1 overload, T-junction
  {
    grid: [
      ["..", "S0", "..", "..", "..", ".."],
      ["..", "─0", "..", "..", "..", ".."],
      ["..", "T1", "L2", "!0", "..", ".."],
      ["..", "─0", "─0", "..", "..", ".."],
      ["..", "D0", "D0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 14,
  },

  // Level 45: 6x6, 1→1, 4 overload
  {
    grid: [
      ["S0", "..", "..", "D2", "..", ".."],
      ["─0", "!0", "!0", "─0", "..", ".."],
      ["L0", "─1", "─1", "L3", "..", ".."],
      ["..", "!0", "!0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 17,
  },

  // Level 46: 6x6, 2→2
  {
    grid: [
      ["S0", "..", "..", "..", "..", "S0"],
      ["─0", "..", "..", "..", "..", "─0"],
      ["L0", "─1", "D3", "D1", "─1", "L3"],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 47: 6x6, 1→2, 4 blocked, 1 overload, cross tile
  {
    grid: [
      ["..", "..", "S0", "..", "..", ".."],
      ["..", "X0", "─0", "X0", "..", ".."],
      ["..", "X0", "+0", "─1", "─1", "D3"],
      ["!0", "X0", "─0", "..", "..", ".."],
      ["..", "..", "L0", "─1", "D3", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 16,
  },

  // Level 48: 6x6, 1→3, 4 blocked, cross tile
  {
    grid: [
      ["..", "..", "S0", "..", "..", ".."],
      ["..", "X0", "─0", "X0", "..", ".."],
      ["D1", "─1", "+0", "─1", "D3", ".."],
      ["..", "X0", "─0", "X0", "..", ".."],
      ["..", "..", "D0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 49: 6x6, 2→2, 2 overload
  {
    grid: [
      ["..", "S0", "..", "D2", "..", ".."],
      ["..", "L0", "─1", "L3", "!0", ".."],
      ["..", "L1", "─1", "─1", "D3", ".."],
      ["..", "─0", "..", "..", "!0", ".."],
      ["..", "─0", "..", "..", "..", ".."],
      ["..", "S2", "..", "..", "..", ".."],
    ],
    maxMoves: 20,
  },

  // Level 50: 6x6, 2→3, cross tile
  {
    grid: [
      ["..", "..", "S0", "..", "S0", ".."],
      ["..", "..", "─0", "..", "─0", ".."],
      ["D1", "─1", "+0", "─1", "D3", ".."],
      ["..", "..", "─0", "..", "..", ".."],
      ["..", "..", "D0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 14,
  },

];

// ─── Level Loader ────────────────────────────────────────────────────────────

function seedRandom(seed: number) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const CHAR_TO_TYPE: Record<string, PipeTileType> = {
  "S": "source",
  "D": "device",
  "─": "straight",
  "L": "elbow",
  "T": "t-junction",
  "+": "cross",
  "X": "blocked",
  "!": "overload",
  ".": "empty",
};

export function getPipeLevel(levelIdx: number): PipeLevelData {
  const idx = levelIdx < RAW_LEVELS.length ? levelIdx : levelIdx % RAW_LEVELS.length;
  const raw = RAW_LEVELS[idx];
  const gridSize = raw.grid.length;
  const tiles: PipeTile[] = [];
  const random = seedRandom((levelIdx + 1) * 777);

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < raw.grid[r].length; c++) {
      const code = raw.grid[r][c];
      const typeChar = code[0];
      const solvedRot = parseInt(code[1], 10);
      const type = CHAR_TO_TYPE[typeChar] || "empty";

      if (type === "empty") {
        tiles.push({ row: r, col: c, type: "empty", rotation: 0, solvedRotation: 0, fixed: true });
        continue;
      }

      const fixed = type === "source" || type === "device" || type === "blocked" || type === "overload";

      // Scramble rotation for non-fixed tiles
      let rotation = solvedRot;
      if (!fixed) {
        // Randomly offset from solved rotation (but never start at solved)
        const offsets = [1, 2, 3];
        const offset = offsets[Math.floor(random() * offsets.length)];
        rotation = (solvedRot + offset) % 4;
      }

      tiles.push({ row: r, col: c, type, rotation, solvedRotation: solvedRot, fixed });
    }
  }

  return { gridSize, tiles, maxMoves: raw.maxMoves };
}

export const TOTAL_PIPE_LEVELS = RAW_LEVELS.length;