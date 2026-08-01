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
// Grid format: array of rows, each row is array of 2-char codes
// The rotation digit is the SOLVED rotation. On load we scramble them.
//
// VERIFIED PATH NOTATION:
//  S0→B means source(rot=0) emits Bottom
//  ─0  = straight vertical (T+B)
//  ─1  = straight horizontal (R+L)
//  L0  = elbow T+R,  L1=R+B,  L2=B+L,  L3=T+L
//  T0  = T+R+L(noB) T1=T+R+B(noL) T2=R+B+L(noT) T3=T+B+L(noR)
//  D0  = receives T, D1=receivesL, D2=receivesB, D3=receivesR

interface RawLevel {
  grid: string[][];
  maxMoves: number;
}

const RAW_LEVELS: RawLevel[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: TUTORIAL (Levels 1–8) — 4×4, 1 Source → 1 Device
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 1: Simplest — straight vertical path
  // S0(0,0)→emitsB → ─0(1,0)[T+B] → ─0(2,0)[T+B] → D0(3,0)[receivesT] ✓
  {
    grid: [
      ["S0", "..", "..", ".."],
      ["─0", "..", "..", ".."],
      ["─0", "..", "..", ".."],
      ["D0", "..", "..", ".."],
    ],
    maxMoves: 8,
  },

  // Level 2: Straight horizontal path
  // S3(1,0)→emitsR → ─1(1,1)[R+L] → ─1(1,2)[R+L] → D3(1,3)[receivesR]? No, D3=receivesR means
  //   the device has open side=R. So neighbor to its left needs B side. Actually D3 opens RIGHT side.
  //   S3 emits RIGHT → ─1 passes horizontally → D1(1,3)[receivesL] ✓
  {
    grid: [
      ["..", "..", "..", ".."],
      ["S3", "─1", "─1", "D1"],
      ["..", "..", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 8,
  },

  // Level 3: One elbow turn
  // S0(0,0)→emitsB → L1(1,0)[R+B] accepts top? NO. Need L1 to accept top.
  // L0(1,0)[T+R] accepts top✓ → goes right → ─1(1,1)[R+L] → D1(1,2)[receivesL] ✓
  {
    grid: [
      ["S0", "..", "..", ".."],
      ["L0", "─1", "D1", ".."],
      ["..", "..", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 8,
  },

  // Level 4: Two elbows, L-shape
  // S3(1,0)→emitsR → L2(1,1)[B+L] accepts L ✓ → goes B → L1(2,1)[R+B] accepts T? NO.
  // S3(1,0)→emitsR → L1(1,1)[R+B] accepts L? L1=[R+B] L=false. NO.
  // Let's do: S0(0,1)→emitsB → ─0(1,1)[T+B] → L1(2,1)[R+B] goes R → D1(2,2)[receivesL]? D1=[receivesL]=opens LEFT ✓
  {
    grid: [
      ["..", "S0", "..", ".."],
      ["..", "─0", "..", ".."],
      ["..", "L1", "D1", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 9,
  },

  // Level 5: S-curve path
  // S0(0,0)→emitsB → L1(1,0)[R+B] accepts T? L1 top=false. NEED L that accepts top.
  // S0(0,2)→B → ─0(1,2)[T+B] → L2(2,2)[B+L] goes B → D2(3,2)[receivesB]? No, D2=opens bottom (receives from below).
  //   Wait - D2 means device at rot=2: base[T,F,F,F] rotate 2x → [F,F,T,F] = opens bottom. So it receives from above via bottom... 
  //   Actually D2 opens its BOTTOM port. So a tile BELOW it connecting top to D2's bottom would power it.
  //   But that's weird. Let me reconsider.
  //   D receives power when any powered neighbor connects to its open port.
  //   D0 = opens top. Powered from above. D1 = opens left. Powered from right neighbor. 
  //   D2 = opens bottom. Powered from below. D3 = opens right. Powered from left neighbor.
  //
  // Path: S0(0,0)→B → L1(1,0)[R+B] NO (T=false). 
  // Use S3(0,0)→emitsR → L2(0,1)[B+L] L=true ✓ → goes B → ─0(1,1)[T+B] → L3(2,1)[T+L] T=true ✓ → goes L → D3(2,0)[receivesR]? D3=opens R. Neighbor to right of D3 is L3 which has L port. ✓ 
  //   Wait: D3 opens RIGHT. Power flows from left? Power source emits right from a neighbor that has right port. 
  //   L3(2,1) has T+L. Left port = true. So L3 emits left to (2,0). D3 at (2,0) needs to receive from right (its R port open).
  //   D3=[T,F,F,F] rot3 → [T,F,F,T] wait: rotate 3x: start [T,R,F,F] base for device is [T,F,F,F].
  //   rot1: pop F(L) → unshift → [F,T,F,F] = opens R
  //   rot2: pop F(L) → unshift → [F,F,T,F] = opens B  
  //   rot3: pop F → unshift → [F,F,F,T] = opens L. So D3 opens LEFT.
  //   Neighbor to RIGHT of D3 is (2,1)=L3. L3 has L port. D3 has L port open. L3 emits left → D3 receives from right? 
  //   Actually BFS: L3(2,1) fires left (L index=3). Neighbor at left dc=-1 = (2,0)=D3. Neighbor side = R (index=1). D3 opens L (index=3). Not right → no connection.
  //   
  //   Let me use D1 which opens LEFT (rot=1): base[T,F,F,F] rot1: pop F→ unshift [F,T,F,F]. Wait that opens R not L.
  //   
  //   Re-derive device rotations carefully:
  //   base = [T:true, R:false, B:false, L:false]
  //   rot=0: [T:true, R:false, B:false, L:false] → opens TOP
  //   rot=1: last(L=false)→front: [false, true, false, false] → opens RIGHT  
  //   rot=2: last(L=false)→front: [false, false, true, false] → opens BOTTOM (wait no)
  //          Actually from rot=1 [F,T,F,F], rotate again: pop last(F)→front: [F,F,T,F] → opens BOTTOM... no that's [T→F, R→F, B→T, L→F] = opens bottom ✓
  //   rot=3: from rot=2 [F,F,T,F], rotate again: pop last(F)→front: [F,F,F,T] → opens LEFT ✓
  //   
  //   So: D0=opensTop D1=opensRight D2=opensBottom D3=opensLeft
  //   Power is received when a powered neighbor connects to device's open port:
  //   D0: neighbor ABOVE must have B port. D1: neighbor to RIGHT must have L port. D2: neighbor BELOW must have T port. D3: neighbor to LEFT must have R port.
  //
  // OK! Now let me redo Level 5:
  // Simple S-curve: S0(0,0)→B → L1(1,0)[R+B]... L1 top=false. Can't receive from above.
  // L0(1,0)[T+R] ✓ receives top, emits right. → ─1(1,1)[R+L] → L3(1,2)[T+L]... L3=[T,F,F,T] opens T and L. 
  //   So from ─1(1,1) emitting right → L3(1,2) needs L=true ✓. L3 emits top → D0(0,2)[opensTop]? D0 needs neighbor below to have B port. L3 emits top, so the tile above L3 at (0,2) receives from below. D0 opens top not bottom. Hmm.
  //   Wait: L3 has T port. That means L3 connects UPWARD. Neighbor ABOVE L3 at (0,2) needs B port. D2 opens bottom = B:true. ✓ So path: ...→L3(1,2)→D2(0,2)
  {
    grid: [
      ["S0", "..", "D2", ".."],
      ["L0", "─1", "L3", ".."],
      ["..", "..", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 9,
  },

  // Level 6: Longer path with two elbows (4x4)
  // S0(0,1)→B → ─0(1,1)[T+B] → L1(2,1)[R+B] goes R → ─1(2,2)[R+L] → D3(2,3)[opensLeft]? D3=opensLeft, needs neighbor to right with L port. ─1 at (2,2) has R+L. Going right → (2,3)=D3. D3 opens left. Neighbor to RIGHT of D3 is out of bounds. Power arrives at D3 from LEFT. ─1(2,2) emits right → (2,3). D3 opens left (L:true). BFS: ─1 emits R → nkey=(2,3), neighborSideIdx=L(3). D3 has L:true ✓. WIN!
  {
    grid: [
      ["..", "S0", "..", ".."],
      ["..", "─0", "..", ".."],
      ["..", "L1", "─1", "D3"],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 7: Zigzag (4x4)
  // S0(0,0)→B → ─0(1,0)[T+B] → L1(2,0)[R+B] goes R → L0(2,1)[T+R] goes T → D2(1,1)[opensBottom]? 
  //   D2 opens B. Neighbor BELOW D2 at (2,1)=L0. L0 has T port. BFS: L0(2,1) fires T(top) → neighbor (1,1)=D2, neighborSideIdx=B(2). D2 opens B ✓. WIN!
  {
    grid: [
      ["S0", "..", "..", ".."],
      ["─0", "D2", "..", ".."],
      ["L1", "L0", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 8: U-turn path (4x4)
  // S0(0,0)→B → ─0(1,0)[T+B] → L1(2,0)[R+B]... wait L1=[R+B] but coming from top, need T. Use ─0 all the way down then elbow.
  // S0(0,0)→B → ─0(1,0) → ─0(2,0) → L1(3,0)[R+B]? L1 accepts T? L1=[F,R,B,F] T=false. NO.
  // S0(0,0)→B → ─0(1,0) → ─0(2,0) → L0(3,0)[T+R] L0 accepts T ✓ → goes R → ─1(3,1) → ─1(3,2) → L3(3,3)[T+L] T=false for L3... L3=[T,F,F,T] T=true? 
  //   L3: rotate base[T,T,F,F] 3 times. rot1=[F,T,T,F] rot2=[F,F,T,T] rot3=[T,F,F,T] → L3=[T:true,R:false,B:false,L:true] ✓ T+L
  //   L0(3,0)→R → ─1(3,1)→R+L → ─1(3,2)→R+L → L3(3,3)[T+L] L=true ✓ → goes T → ─0(2,3)[T+B] → ─0(1,3) → D0(0,3)[opensTop] ✓
  {
    grid: [
      ["S0", "..", "..", "D2`"],
      ["─0", "..", "..", "─0"],
      ["─0", "..", "..", "─0"],
      ["L0", "─1", "─1", "L3"],
    ],
    maxMoves: 11,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: EASY-MEDIUM (Levels 9–18) — 4×4→5×5, T-junctions + blocked tiles
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 9: First T-junction (4x4) — 1 source, 2 devices
  // S0(0,1)→B → T1(1,1)[T+R+B, no L] goes B and R
  //   Branch 1: T1→B → D0(2,1)[opensTop]? D0 opens T, neighbor below T1 at (2,1) with B port. T1 has B ✓
  //   Branch 2: T1→R → D1(1,2)[opensRight]? D1=opensRight. Neighbor LEFT of D1 at (1,1)=T1. T1 has R ✓ → D1 has no L? D1=[F,T,F,F] L=false. 
  //   Hmm: BFS T1(1,1) fires R → neighbor(1,2)=D1, neighborSideIdx=L(3). D1 has L? D1 rot=1: [F,T,F,F] L=false. NO.
  //   Use D3 at (1,2): D3=[T,F,F,T] L=true. BFS T1 fires R → (1,2) neighborSide=L. D3 has L=true ✓... but D3 opens LEFT means it receives from LEFT. The neighbor with R port is T1. D3 L=true. ✓
  //   Wait, checking code: `nConns[neighborSideIdx]` where neighborSideIdx for right-firing is L(3). D3 L=true ✓. 
  {
    grid: [
      ["..", "S0", "..", ".."],
      ["..", "T1", "D3", ".."],
      ["..", "D0", "..", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 9,
  },

  // Level 10: T-junction with longer path (4x4)
  // S0(0,2)→B → ─0(1,2)[T+B] → T2(2,2)[R+B+L, no T]:
  //   T2=[F,T,T,T] rot2: base[T,T,F,T] rotate 2x: rot1→pop T(L)→unshift [T,T,T,F] rot2→pop F→unshift [F,T,T,T] ✓ R+B+L
  //   Branch1: T2→R → D1(2,3)[opensR] D1=[F,T,F,F] L=false. Need D3. D3 L=true. ✓ but D3 opens L (receives from R neighbor)... wait D3=[T,F,F,T] L=true. So D3 can accept from a neighbor with R port. T2 has R. ✓
  //   Branch2: T2→B → D0(3,2)[opensTop] BFS T2 fires B→(3,2) neighborSide=T. D0 T=true ✓
  {
    grid: [
      ["..", "..", "S0", ".."],
      ["..", "..", "─0", ".."],
      ["..", "..", "T2", "D3"],
      ["..", "..", "D0", ".."],
    ],
    maxMoves: 10,
  },

  // Level 11: First blocked tile (4x4) — blocked forces detour
  // S0(0,0)→B → ─0(1,0)[T+B] → L1(2,0)[R+B]? L1 T=false. Need T. Use L0(2,0)[T+R] → ─1(2,1) → L3(2,2)[T+L] T=true... wait L3=[T,F,F,T]. From ─1 going R → L3 receives L ✓. L3→T → D2(1,2)[opensBottom] neighbor below D2 is L3 which has T, BFS L3 fires T → D2 at (1,2) neighborSide=B. D2=[F,F,T,F] B=true ✓.
  // Blocked at (1,1) forces detour along row 2.
  {
    grid: [
      ["S0", "..", "..", ".."],
      ["─0", "X0", "D2", ".."],
      ["L0", "─1", "L3", ".."],
      ["..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 12: Blocked tile forcing detour (5x5)
  // S0(0,0)→B → L0(1,0)[T+R] → ─1(1,1)[R+L] → L3(1,2)[T+L]? L3 L=true ✓ → T → ─0(0,2)[T+B]? That goes back up to (0,2), dead end. Let's rethink.
  // S0(0,0)→B → L0(1,0)[T+R] → ─1(1,1) → ─1(1,2) → ─1(1,3) → D3(1,4)[opensLeft] D3 L=true ✓.
  // Block at (1,1) forces going around... But (1,1) is ─1 which IS on the path. Let me put block elsewhere.
  // Better: S0(0,0)→B → ─0(1,0) → ─0(2,0) → L1(3,0)[R+B]? T=false. Use L0(3,0)[T+R] → ─1(3,1) → ─1(3,2) → ─1(3,3) → D3(3,4)[opensLeft] ✓. Block at (1,2) and (2,2).
  {
    grid: [
      ["S0", "..", "..", "..", ".."],
      ["─0", "..", "X0", "..", ".."],
      ["─0", "..", "X0", "..", ".."],
      ["L0", "─1", "─1", "─1", "D3"],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 13: T-junction + blocked (5x5)
  // Two-device split. S0(0,2)→B → ─0(1,2)[T+B] → T2(2,2)[R+B+L]:
  //   Branch1: T2→R → ─1(2,3) → D1(2,4)[opensRight] D1=[F,T,F,F] L=false. ✗
  //   Use D3(2,4)[opensLeft]: D3 L=true ✓ BFS: ─1(2,3) fires R → (2,4) neighborSide=L. D3 L=true ✓
  //   Branch2: T2→B → D0(3,2)[opensTop] ✓
  //   Block at (2,0) and (2,1) to prevent left branch from going to empty tiles (T2 has L but no tile there with R → safe).
  //   Actually T2 has L=true but (2,1) is X so BFS stops there ✓.
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "..", "─0", "..", ".."],
      ["X0", "X0", "T2", "─1", "D3"],
      ["..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // Level 14: Multi-blocked detour (5x5)
  // S3(0,0)→emitsR → ─1(0,1) → L2(0,2)[B+L] L=true ✓ → goes B → ─0(1,2) → ─0(2,2) → L0(3,2)[T+R]? T=true ✓ → goes R → ─1(3,3) → D3(3,4)[opensLeft] ✓
  // Block at (1,0),(2,0),(1,1),(2,1) to force going via top row.
  {
    grid: [
      ["S3", "─1", "L2", "..", ".."],
      ["X0", "X0", "─0", "..", ".."],
      ["X0", "X0", "─0", "..", ".."],
      ["..", "..", "L0", "─1", "D3"],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 15: T split with blocks (5x5)
  // S0(0,2)→B → ─0(1,2) → T1(2,2)[T+R+B no L]:
  //   Branch1: T1→R → ─1(2,3) → D1(2,4)[opensRight] D1=[F,T,F,F] L? = false ✗. Use D3(2,4) ✓
  //   Branch2: T1→B → ─0(3,2) → D0(4,2)[opensTop] ✓
  // Block at (2,0),(2,1) — T1 no left anyway so fine.
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

  // Level 16: Winding path with blocks (5x5)
  // S0(0,0)→B → ─0(1,0) → L0(2,0)[T+R] → ─1(2,1) → ─1(2,2) → L3(2,3)[T+L] L=true ✓ → T → D2(1,3)[opensBottom]? D2 B=true. Neighbor BELOW D2=(2,3)=L3 which has T. BFS L3 fires T→(1,3) neighborSide=B. D2 B=true ✓.
  // Blocks at (3,2),(4,2) to guide.
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

  // Level 17: Complex T usage (5x5) — 1 source, 2 devices
  // S0(0,1)→B → T1(1,1)[T+R+B]:
  //   Branch1: T1→R → L2(1,2)[B+L] L=true ✓ → B → D0(2,2)[opensTop]? D0 T=true. Neighbor below L2=(2,2)=D0. BFS L2 fires B→(2,2) neighborSide=T. D0 T=true ✓.
  //   Branch2: T1→B → ─0(2,1) → D0(3,1)[opensTop] ✓
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

  // Level 18: Dense 5x5 with T + blocks — 1 source, 2 devices
  // S0(0,2)→B → ─0(1,2) → T2(2,2)[R+B+L]:
  //   Branch1: T2→R → ─1(2,3) → D3(2,4)[opensLeft] ✓
  //   Branch2: T2→B → D0(3,2)[opensTop] ✓
  //   T2→L → (2,1) = X blocked ✓ stops there
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "X0", "─0", "X0", ".."],
      ["..", "X0", "T2", "─1", "D3"],
      ["..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 10,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: MEDIUM (Levels 19–30) — 5×5, 1→2 devices, overloads
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 19: First 1→2 split (5x5)
  // S0(0,2)→B → T1(1,2)[T+R+B]:
  //   Branch1: T1→R → D1(1,3)[opensRight] D1=[F,T,F,F] needs neighbor to right with L. Neighbor at (1,4). Hmm D1 opens RIGHT so it receives from a tile to its LEFT. BFS: T1 fires R → (1,3) neighborSide=L. D1 L? D1=[F,T,F,F] L=false ✗.
  //   Use D3(1,3): D3=[T,F,F,T] L=true. BFS T1→R→(1,3) neighborSide=L. D3 L=true ✓.
  //   Branch2: T1→B → D0(2,2) ✓
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

  // Level 20: Split with detour (5x5)
  // S0(0,1)→B → T1(1,1)[T+R+B]:
  //   Branch1: T1→R → L2(1,2)[B+L] L=true ✓ → B → ─0(2,2) → D0(3,2) ✓
  //   Branch2: T1→B → L1(2,1)[R+B] T=false! Need L0(2,1)[T+R]. T=true ✓ → R → ─1(2,2)... but (2,2) already used for Branch1. Plan differently.
  //   Branch2: T1→B → ─0(2,1) → L0(3,1)[T+R] T=true? Wait L0 is just the elbow at rot=0 with T+R. ─0 fires B → (3,1) neighborSide=T. L0 T=true ✓ → R → D1(3,2)[opensRight]? D1=[F,T,F,F] needs L. D3(3,2)[L=true] ✓.
  {
    grid: [
      ["..", "S0", "..", "..", ".."],
      ["..", "T1", "..", "..", ".."],
      ["..", "─0", "..", "..", ".."],
      ["..", "L0", "D3", "..", ".."],
      ["..", "..", "", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 21: First overload hazard (5x5)
  // Path must avoid the overload tile.
  // S0(0,0)→B → ─0(1,0) → L0(2,0)[T+R] → ─1(2,1) → ─1(2,2) → L3(2,3)[T+L] L=true ✓ → T → D2(1,3)[opensBottom]? ✓
  // Overload at (2,2) replaced: let's put overload OFF the path.
  // Overload at (1,2)!0 — S at (0,0) goes down col 0, turns right at row 2, goes to col 3, then up. Overload at (1,2) is not on the path (path goes through row 2). ✓
  {
    grid: [
      ["S0", "..", "..", "..", ".."],
      ["─0", "..", "!0", "D2", ".."],
      ["L0", "─1", "─1", "L3", ".."],
      ["..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 22: Overload on natural path forcing detour (5x5)
  // S0(0,1)→B → !0(1,1) would be direct but it's overloaded. Must go around.
  // Path: S0(0,1)→B → L1(1,1)? No, player can't rotate overload. We put overload as a fixed HAZARD at (1,1). Path must go around.
  // S0(0,2)→B, overload at (1,2). Forced to take different route via elbow.
  // S3(0,0)→R → ─1(0,1) → L2(0,2)[B+L] L=true ✓ →... wait player can't see the solution easily. Let me think again.
  // Actually overload is FIXED and can't be moved. Player needs to route wires AROUND it. The path tiles (non-fixed) start scrambled. Player rotates them. Overload is a trap — if the circuit passes through it = lose a life. So the solution path avoids overload.
  //
  // S0(0,2)→B, overload at (1,2) blocks straight path.
  // Solution path: S0(0,2)→B at (0,2). Hmm S emits B. Neighbor below is overload. That IS a problem — source directly connects to overload!
  //   Actually wait: source at (0,2) emits bottom. Overload at (1,2) has all ports open. So BFS: S fires B → (1,2)=overload. Overload detected → hitOverload! Player can't avoid this.
  //   So overload must NOT be directly adjacent to the source in the solution direction.
  //
  // S3(0,0)→R → ─1(0,1) → L2(0,2)[B+L] → B → ─0(1,2) → ─0(2,2) → L3(3,2)[T+L] → T → D2(2,2)? Already used.
  // Let me just do a clean level:
  // S0(0,0)→B → L0(1,0)[T+R] → ─1(1,1) → L3(1,2)[T+L] → T → D2(0,2) ✓
  // Overload at (1,3) — not on path. Not adjacent to any path tile that would connect to it.
  // Actually ─1(1,1) has R+L. ─1 fires R → (1,2)=L3 ✓. And fires L → (1,0)=L0 already powered. And (1,3) if ─1 at (1,2)... L3 at (1,2) has T+L only, no R. So (1,3)=overload not reachable ✓.
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

  // Level 23: Split + overload (5x5)
  // S0(0,2)→B → T1(1,2)[T+R+B]:
  //   Branch1: T1→R → ─1(1,3) → D3(1,4) ✓
  //   Branch2: T1→B → ─0(2,2) → D0(3,2) ✓
  // Overload at (2,3) — T1 fires R to (1,3) then to (1,4). ─1(1,3) has R+L. Fires R to D3, fires L to T1 (already powered). Does ─1(1,3) have B? No, R+L only. So (2,3)=overload not connected ✓.
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

  // Level 24: Two overloads (5x5)
  // S3(0,0)→R → L2(0,1)[B+L] L=true ✓ → B → ─0(1,1) → ─0(2,1) → L1(3,1)[R+B]? T=false. Use L0(3,1)[T+R] T=true ✓ → R → ─1(3,2) → ─1(3,3) → D3(3,4) ✓
  // Overloads at (1,3) and (2,3) not on path ✓.
  {
    grid: [
      ["S3", "L2", "..", "..", ".."],
      ["..", "─0", "..", "!0", ".."],
      ["..", "─0", "..", "!0", ".."],
      ["..", "L0", "─1", "─1", "D3"],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 25: Forced split around overloads (5x5)
  // S0(0,2)→B → T1(1,2)[T+R+B]:
  //   Branch1: T1→R → ─1(1,3) → D3(1,4) ✓ (overload NOT here)
  //   Branch2: T1→B → ─0(2,2) → L0(3,2)[T+R] → ─1(3,3) → D3(3,4) ✓
  // Overload at (2,0) and (2,4) not on path.
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

  // Level 26: Complex medium (5x5)
  // S3(0,0)→R → ─1(0,1) → L2(0,2)[B+L] L=true ✓ → B → ─0(1,2) → T2(2,2)[R+B+L]:
  //   Branch1: T2→R → ─1(2,3) → D3(2,4) ✓
  //   Branch2: T2→B → D0(3,2) ✓
  //   T2→L: (2,1)=X blocked ✓
  {
    grid: [
      ["S3", "─1", "L2", "..", ".."],
      ["..", "X0", "─0", "..", ".."],
      ["..", "X0", "T2", "─1", "D3"],
      ["..", "..", "D0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 27: Overload corridor (5x5)
  // S0(0,2)→B → ─0(1,2) → T2(2,2)[R+B+L]:
  //   Branch1: T2→R → ─1(2,3) → D3(2,4) ✓
  //   Branch2: T2→B → D0(3,2) ✓
  //   T2→L → (2,1)=overload!  BFS T2 fires L → (2,1) overload → hitOverload! BAD.
  //   Need T1 instead: T1=[T+R+B no L]. No L port. So (2,1) overload not triggered ✓.
  //   But then what about (2,0)? T1 no L. Fine.
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

  // Level 28: Wide split (5x5) — source in center, 2 devices on sides
  // S0(1,2)→B... wait source is fixed. Let me use T-junction from a central tile.
  // S3(2,0)→R → T0(2,2)? Need pipes between. S3(2,0)→R → ─1(2,1) → T0(2,2)[T+R+L no B]:
  //   T0=[T,T,F,T] ✓ T+R+L
  //   Branch1: T0→R → ─1(2,3) → D3(2,4) ✓ wait D3 opens left. BFS ─1(2,3) fires R→(2,4) neighborSide=L. D3 L=true ✓.
  //   Branch2: T0→T → D2(1,2)[opensBottom]? D2 B=true. BFS T0 fires T→(1,2) neighborSide=B. D2 B=true ✓.
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

  // Level 29: Dense medium puzzle (5x5) — cross tile
  // S0(0,2)→B → ─0(1,2) → +0(2,2)[all] → fires in all 4 directions:
  //   →R: ─1(2,3)→D3(2,4) ✓
  //   →L: ─1(2,1)→D3(2,0)? D3 L=true. BFS ─1(2,1) fires L→(2,0) neighborSide=R. D3 R? D3=[T,F,F,T] R=false ✗.
  //   Need D1(2,0): D1=[F,T,F,F] R=true. BFS ─1(2,1) fires L→(2,0) neighborSide=R. D1 R=true ✓
  //   →T: (1,2) already powered (path back)
  //   →B: L1(3,2)[R+B]? Cross fires B→(3,2). L1 T=false ✗. Use L0(3,2)[T+R] T=true ✓ → R → D1(3,3)[opensRight]? D1=[F,T,F,F] L=false. Need D3(3,3): D3 L=true. BFS L0 fires R→(3,3) neighborSide=L. D3 L=true ✓.
  // Blocks at (2,1)→instead use ─1 routing. Let me simplify.
  // S0(0,2)→B → ─0(1,2) → +0(2,2) → four branches:
  //   R: ─1(2,3)→D3(2,4) ✓
  //   L: ─1(2,1)→D1(2,0) ✓ (D1 R=true)
  //   T: back to ─0, already powered — fine (not a new device)
  //   B: ─0(3,2)→D0(4,2) ✓
  // This is 3 devices from 1 source. Use a T instead for 2 devices.
  // S0(0,2)→B → ─0(1,2) → T2(2,2)[R+B+L]:
  //   L: ─1(2,1)→D1(2,0)[D1 R=true] ✓
  //   R: ─1(2,3)→D3(2,4) ✓
  //   B: dead end (X at 3,2)
  {
    grid: [
      ["..", "..", "S0", "..", ".."],
      ["..", "X0", "─0", "X0", ".."],
      ["D1", "─1", "T2", "─1", "D3"],
      ["..", "..", "X0", "..", ".."],
      ["..", "..", "..", "..", ".."],
    ],
    maxMoves: 11,
  },

  // Level 30: Medium capstone (5x5) — multiple paths and overload
  // S0(0,1)→B → T1(1,1)[T+R+B]:
  //   Branch1: T1→R → L2(1,2)[B+L] L=true ✓ → B → ─0(2,2) → D0(3,2) ✓
  //   Branch2: T1→B → ─0(2,1) → L0(3,1)[T+R] → R → ─1(3,2)? (3,2) already has D0. Let me adjust.
  // S0(0,2)→B → T1(1,2)[T+R+B]:
  //   B1: T1→R → ─1(1,3) → D3(1,4) ✓
  //   B2: T1→B → ─0(2,2) → L0(3,2)[T+R] → R → ─1(3,3) → D3(3,4) ✓
  // Overload at (2,0) not on any path. ✓
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
  // TIER 4: HARD (Levels 31–40) — 5×5→6×6, dense blocks, multi-source
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 31: First 6x6
  // S0(0,1)→B → ─0(1,1) → T2(2,1)[R+B+L]:
  //   B1: T2→R → ─1(2,2)→─1(2,3)→L3(2,4)[T+L] L=true ✓ →T→─0(1,4)→D2(0,4)[opensBottom]? D2 B=true. ✓
  //   B2: T2→B → L0(3,1)[T+R] → R → ─1(3,2)→D3(3,3)[opensLeft] D3 L=true ✓
  //   T2→L: (2,0) empty, T2 L=true... BFS fires L→(2,0) empty → skip ✓ (empty type skipped)
  {
    grid: [
      ["..", "S0", "..", "..", "D2", ".."],
      ["..", "─0", "..", "..", "─0", ".."],
      ["..", "T2", "─1", "─1", "L3", ".."],
      ["..", "L0", "─1", "D3", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 32: Dense blocks (6x6)
  // S3(0,0)→R → ─1(0,1) → L2(0,2)[B+L] ✓ → B → ─0(1,2) → ─0(2,2) → T2(3,2)[R+B+L]:
  //   B1: T2→R → ─1(3,3) → D3(3,4) ✓
  //   B2: T2→B → D0(4,2) ✓
  //   T2→L: (3,1)=X ✓ stops
  // Blocks: (1,0),(2,0),(1,1),(2,1)
  {
    grid: [
      ["S3", "─1", "L2", "..", "..", ".."],
      ["X0", "X0", "─0", "..", "..", ".."],
      ["X0", "X0", "─0", "..", "..", ".."],
      ["..", "X0", "T2", "─1", "D3", ".."],
      ["..", "..", "D0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 33: Overload maze (6x6)
  // S0(0,2)→B → ─0(1,2) → L0(2,2)[T+R] → ─1(2,3) → L3(2,4)[T+L] L=true ✓ → T → ─0(1,4) → D2(0,4)[opensBottom] ✓
  // Overloads at (1,1) and (1,3) — not on path ✓ (path goes through (1,2) and (1,4) only)
  // Block at (3,3) to prevent accidental completion.
  {
    grid: [
      ["..", "..", "S0", "..", "D2", ".."],
      ["..", "!0", "─0", "!0", "─0", ".."],
      ["..", "..", "L0", "─1", "L3", ".."],
      ["..", "..", "..", "X0", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 34: Multi-path split (6x6) — dual device
  // S0(0,3)→B → T1(1,3)[T+R+B]:
  //   B1: T1→R → ─1(1,4) → D3(1,5) ✓
  //   B2: T1→B → L0(2,3)[T+R]? wait T=true ✓ → R → D1(2,4)[opensRight]? D1=[F,T,F,F] needs L. ─ wrong. 
  //   Use D3(2,4): D3 L=true. BFS L0 fires R→(2,4) neighborSide=L. D3 L=true ✓.
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

  // Level 35: Block cluster maze (6x6)
  // S0(0,0)→B → ─0(1,0) → ─0(2,0) → L0(3,0)[T+R] → ─1(3,1) → ─1(3,2) → L3(3,3)[T+L] ✓ → T → ─0(2,3) → ─0(1,3) → D2(0,3)[opensBottom] ✓
  // Blocks at (1,1),(1,2),(2,1),(2,2) to force path along cols 0 and 3.
  {
    grid: [
      ["S0", "..", "..", "D2", "..", ".."],
      ["─0", "X0", "X0", "─0", "..", ".."],
      ["─0", "X0", "X0", "─0", "..", ".."],
      ["L0", "─1", "─1", "L3", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 13,
  },

  // Level 36: First dual source (6x6)
  // Source A: S3(0,0)→R → ─1(0,1) → D3(0,2) ✓
  // Source B: S3(4,2)→R → ─1(4,3) → ─1(4,4) → D3(4,5) ✓
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

  // Level 37: Dual source with detour (6x6)
  // Source A: S0(0,0)→B → ─0(1,0) → L0(2,0)[T+R] → ─1(2,1) → D3(2,2) ✓
  // Source B: S0(3,4)→B → L1(4,4)[R+B] T=false ✗. Use S0(3,5)→B... 
  // S0(3,4)→B → L0(4,4)[T+R]? T=true ✓ → R → D1(4,5)[opensRight]? D1=[F,T,F,F] needs neighbor RIGHT with L. Out of bounds at col6. ✗.
  // S3(3,4)→R → D3(3,5)? D3 needs neighbor LEFT with R. S3 fires R→(3,5). (3,5) neighborSide=L. D3 L=true ✓. Simple!
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

  // Level 38: Dense block + overload (6x6)
  // S0(0,1)→B → ─0(1,1) → L0(2,1)[T+R] → ─1(2,2) → ─1(2,3) → L3(2,4)[T+L] ✓ → T → ─0(1,4) → D2(0,4) ✓
  // Overload at (1,2), blocks at (1,3),(3,3)
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

  // Level 39: Dual source + blocks (6x6)
  // Source A: S0(0,0)→B → ─0(1,0) → L0(2,0)[T+R] → ─1(2,1) → ─1(2,2) → D3(2,3) ✓
  // Source B: S0(3,5)→B → L1(4,5)[R+B]? T=false. S0(3,3)→B → ─0(4,3) → L0(5,3)[T+R] T=true ✓ → R → ─1(5,4) → D3(5,5) ✓
  // Blocks to add tension: (2,4),(3,1)
  {
    grid: [
      ["S0", "..", "..", "..", "..", ".."],
      ["─0", "X0", "..", "..", "..", ".."],
      ["L0", "─1", "─1", "D3", "X0", ".."],
      ["..", "X0", "..", "S0", "..", ".."],
      ["..", "..", "..", "─0", "..", ".."],
      ["..", "..", "..", "L0", "─1", "D3"],
    ],
    maxMoves: 13,
  },

  // Level 40: Hard capstone (6x6) — dual source, overload trap
  // Source A: S0(0,1)→B → T1(1,1)[T+R+B]:
  //   B1: →R → ─1(1,2) → D3(1,3) ✓
  //   B2: →B → ─0(2,1) → L0(3,1)[T+R] → R → ─1(3,2) → D3(3,3) ✓
  // Source B: S0(0,4)→B → L1(1,4)[R+B]? T=false. Use L0(1,4)[T+R] T=true ✓ → R → D1(1,5)[opensRight]? ✗. Use D3(1,5)✓ wait D3 L=true. BFS L0 fires R→(1,5) neighborSide=L. D3 L=true ✓.
  // Overload at (2,3) not on solution path (path uses D3 at (1,3) and goes down col 1-3 separately via source B).
  // Actually (3,2) connects to D3(3,3) ✓. Overload at (2,4) — source B goes down to (1,4)=L0 then right. No down from source B hits overload at (2,4).
  // Source B (0,4) fires B → (1,4)=L0 ✓ → L0 fires R → (1,5)=D3 ✓. L0 fires T... but (0,4)=source already powered. L0 fires T → neighbor (0,4)=S already powered, skipped. Fine. L0 has no B. ✓
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
  // TIER 5: EXPERT (Levels 41–50) — 6×6, zero slack, cross tiles, traps
  // ═══════════════════════════════════════════════════════════════════════════

  // Level 41: First cross tile (6x6)
  // S0(0,2)→B → ─0(1,2) → T2(2,2)[R+B+L]:
  //   B1: →R → +0(2,3)[all] → fires R→─1(2,4)→D3(2,5) ✓ and B→D0(3,3) ✓
  //   B2: T2→B → D0(3,2) ✓
  //   T2→L: (2,1) empty, T2 fires L → nothing. ✓
  //   +0→L → (2,2)=T2 already powered
  //   +0→T → (1,3) empty ✓ (goes to empty, ignored)
  // This gives 3 devices from 1 source via cross.
  {
    grid: [
      ["..", "..", "S0", "..", "..", ".."],
      ["..", "..", "─0", "..", "..", ".."],
      ["..", "..", "T2", "+0", "─1", "D3"],
      ["..", "..", "D0", "D0", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 42: Cross + overloads (6x6)
  // S0(0,2)→B → ─0(1,2) → +0(2,2)[all]:
  //   →R → ─1(2,3) → D3(2,4) ✓
  //   →B → ─0(3,2) → D0(4,2) ✓
  //   →L → (2,1)=overload ✗ TRAP — player must not route to overload. But cross has all 4 sides open and WILL fire left to (2,1). If (2,1)=overload → BAD. Need empty at (2,1), and overload elsewhere.
  //   +0→L: (2,1) empty → skipped ✓
  //   +0→T → (1,2) already powered ✓
  // Overloads at (1,1) and (1,3) — not connected to path.
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

  // Level 43: Overlapping paths — two sources, cross tile (6x6)
  // Source A: S3(1,0)→R → ─1(1,1) → ─1(1,2) → L2(1,3)[B+L] L=true ✓ → B → +0(2,3)[all]:
  //   +0→R → ─1(2,4) → D3(2,5) ✓
  //   +0→B → ─0(3,3) → D0(4,3) ✓
  //   +0→L → (2,2) empty ✓
  //   +0→T → (1,3)=L2 already powered ✓
  // Source B: S0(0,3)→B → L3(1,3)? L3 T=true but (1,3)=L2. Let's re-plan.
  // Source A: S3(2,0)→R → ─1(2,1) → ─1(2,2) → +0(2,3)[all]:
  //   +0→T → ─0(1,3) → D2(0,3) ✓
  //   +0→R → ─1(2,4) → D3(2,5) ✓
  //   +0→B → ─0(3,3) → D0(4,3) ✓
  //   +0→L → (2,2) already powered ✓
  // Blocks at (1,0),(0,0) to prevent easy alternate routes.
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

  // Level 44: False path trap (6x6)
  // S0(0,1)→B → ─0(1,1) → T2(2,1)[R+B+L]:
  //   B1: T2→R → L2(2,2)[B+L] L=true ✓ → B → ─0(3,2) → D0(4,2) ✓
  //   B2: T2→B → ─0(3,1) → L1(4,1)[R+B]? T=false. Use L0(4,1)[T+R] T=true ✓ → R → D1(4,2)[opensRight]? D1=[F,T,F,F] needs neighbor LEFT to have R. L0(4,1) has R. BFS L0 fires R→(4,2). neighborSide=L. D1 R=true... wait D1=[F,T,F,F] L=false ✗.
  //   Use: T2→B → ─0(3,1) → D0(4,1)[opensTop] ✓
  // Overload at (2,3) — T2→R gives L2(2,2)[B+L], L2 fires B→(3,2) and L→(2,1)=T2 already powered. Does L2 fire R? L2=[F,F,T,T] R=false ✓. So (2,3) overload not reached.
  {
    grid: [
      ["..", "S0", "..", "..", "..", ".."],
      ["..", "─0", "..", "..", "..", ".."],
      ["..", "T2", "L2", "!0", "..", ".."],
      ["..", "─0", "─0", "..", "..", ".."],
      ["..", "D0", "D0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 45: Multi overload gauntlet (6x6)
  // S0(0,0)→B → ─0(1,0) → L0(2,0)[T+R] → ─1(2,1) → ─1(2,2) → L3(2,3)[T+L] L=true ✓ → T → ─0(1,3) → D2(0,3)[opensBottom] ✓
  // Overloads flanking the path but NOT on it: (1,1),(1,2),(3,1),(3,2)
  // L0(2,0) fires T→(1,0)=─0 already powered, fires R→(2,1) ✓. Does L0 fire B or L? L0=[T,T,F,F] B=false L=false ✓. No overload reachable.
  {
    grid: [
      ["S0", "..", "..", "D2", "..", ".."],
      ["─0", "!0", "!0", "─0", "..", ".."],
      ["L0", "─1", "─1", "L3", "..", ".."],
      ["..", "!0", "!0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 46: Expert dual source (6x6)
  // Source A: S0(0,0)→B → ─0(1,0) → L0(2,0)[T+R] → ─1(2,1) → D3(2,2) ✓
  // Source B: S0(0,5)→B → ─0(1,5) → L3(2,5)[T+L] T=true ✓ → L → ─1(2,4) → D3(2,3)? D3 L=true. BFS ─1(2,4) fires L→(2,3). neighborSide=R. D3=[T,F,F,T] R=false ✗. Use D1(2,3): D1=[F,T,F,F] R=true ✓.
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

  // Level 47: Expert maze (6x6) — blocked, overload, cross
  // S0(0,2)→B → ─0(1,2) → +0(2,2)[all]:
  //   →T: (1,2) already powered ✓
  //   →R: ─1(2,3) → ─1(2,4) → D3(2,5) ✓
  //   →B: ─0(3,2) → L0(4,2)[T+R] → R → ─1(4,3) → D3(4,4) ✓
  //   →L: (2,1)=X blocked ✓
  // Overload at (3,0) and blocks at (2,1),(3,1) — not on path ✓.
  {
    grid: [
      ["..", "..", "S0", "..", "..", ".."],
      ["..", "X0", "─0", "X0", "..", ".."],
      ["..", "X0", "+0", "─1", "─1", "D3"],
      ["!0", "X0", "─0", "..", "..", ".."],
      ["..", "..", "L0", "─1", "D3", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 14,
  },

  // Level 48: Cross maze expert (6x6)
  // S0(0,2)→B → ─0(1,2) → +0(2,2)[all]:
  //   →L: ─1(2,1) → D3(2,0)[opensLeft] D3 L=true. BFS ─1(2,1) fires L→(2,0) neighborSide=R. D3 R? D3=[T,F,F,T] R=false ✗. Use D1(2,0)! D1=[F,T,F,F] R=true ✓.
  //   →R: ─1(2,3) → D3(2,4) ✓
  //   →B: ─0(3,2) → D0(4,2) ✓
  //   →T: (1,2) already powered ✓
  // Blocks at (1,1),(1,3),(3,1),(3,3) — force through cross tile ✓.
  {
    grid: [
      ["..", "..", "S0", "..", "..", ".."],
      ["..", "X0", "─0", "X0", "..", ".."],
      ["D1", "─1", "+0", "─1", "D3", ".."],
      ["..", "X0", "─0", "X0", "..", ".."],
      ["..", "..", "D0", "..", "..", ".."],
      ["..", "..", "..", "..", "..", ".."],
    ],
    maxMoves: 12,
  },

  // Level 49: Near-zero slack expert (6x6) — dual source, overload, cross
  // Source A: S0(0,1)→B → L0(1,1)[T+R] → R → ─1(1,2) → L3(1,3)[T+L]? L=true ✓ → T → D2(0,3)[opensBottom] ✓
  // Source B: S0(5,1)→B? Wait source emits B=down, so from (5,1) that goes out of grid. Use S2(5,1)[emitsTop]→T → ─0(4,1) → ─0(3,1) → L0(2,1)[T+R] T=true ✓ → R → ─1(2,2) → ─1(2,3) → D3(2,4) ✓
  // Overloads at (1,4),(3,4) not on path.
  {
    grid: [
      ["..", "S0", "..", "D2", "..", ".."],
      ["..", "L0", "─1", "L3", "!0", ".."],
      ["..", "─0", "─1", "─1", "D3", ".."],
      ["..", "─0", "..", "..", "!0", ".."],
      ["..", "─0", "..", "..", "..", ".."],
      ["..", "S2", "..", "..", "..", ".."],
    ],
    maxMoves: 14,
  },

  // Level 50: The ultimate circuit (6x6) — dual source, cross, 3 devices
  // Source A: S0(0,1)→B → ─0(1,1) → T1(2,1)[T+R+B]:
  //   →R: ─1(2,2) → +0(2,3)[all]:
  //       +0→R → ─1(2,4) → D3(2,5) ✓
  //       +0→B → ─0(3,3) → D0(4,3) ✓
  //       +0→T → D2(1,3)[opensBottom] ✓
  //   →B: ─0(3,1) → D0(4,1) ✓
  // Source B: S0(0,5)→B → ─0(1,5) → L3(2,5)[T+L]? But (2,5)=D3 already. 
  // Let me simplify. Source A powers everything.
  // S0(0,2)→B → ─0(1,2) → +0(2,2)[all]:
  //   →L: ─1(2,1) → D3(2,0) ✓ (D3 L=true, BFS ─1 fires L→(2,0) neighborSide=R, D3 R? [T,F,F,T] R=false ✗). Use D1(2,0) R=true ✓.
  //   →R: ─1(2,3) → D3(2,4) ✓
  //   →T: ─0(1,2) already powered ✓  
  //   →B: ─0(3,2) → D0(4,2) ✓
  // Source B: S0(0,4)→B → ─0(1,4) → L3(2,4)[T+L]? (2,4)=D3 already used above.
  //   Use separate path: S0(0,4)→B → ─0(1,4) → D2(2,4)[opensBottom] D2 B=true. BFS ─0(1,4) fires B→(2,4) neighborSide=T. D2 T? D2=[F,F,T,F] T=false ✗. 
  //   S0(0,4)→B → ─0(1,4) → L3(2,4)[T+L] L=true... but (2,3)=─1 which fires R→(2,4)=L3. L3 L=true ✓. And (1,4)=─0 fires B→(2,4) neighborSide=T. L3 T=true ✓. So (2,4) could be L3 hit from both sides.
  //   Then L3→L → (2,3)=─1 already powered ✓. L3→T → (1,4) already powered ✓. L3 has no B or R. ✓.
  //   But then there's no device for source B. Let me use a simpler dual-source approach.
  //
  // Final Level 50: Two sources, full cross junction, 3 devices:
  // Source A: S0(0,2)→B → ─0(1,2) → +0(2,2):
  //   →R → ─1(2,3) → D3(2,4) ✓
  //   →L → ─1(2,1) → D1(2,0) ✓ (D1 R=true)
  //   →B → ─0(3,2) → D0(4,2) ✓
  // Source B: S0(0,4)→B → ─0(1,4) → ─0(2,4)[= taken by D3?]. 
  //   D3 at (2,4) is device. Source B would be (1,4)→B→(2,4)=D3, but D3 opens LEFT not TOP. D3 T=true? D3=[T,F,F,T] T=true! So BFS ─0(1,4) fires B→(2,4) neighborSide=T. D3 T=true ✓! 
  //   So Source B: S0(0,4)→B → ─0(1,4) → D3(2,4) ✓ (D3 gets powered from both path A's right branch AND source B's path).
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
