export interface KnifeLevel {
  id: number;
  knivesToThrow: number;
  rotationSpeed: number; // base speed in radians per frame
  changeIntervals?: { duration: number; speed: number }[]; // optional sequence of speed changes
  preStuckKnives: number[]; // angles in radians
}

// Simple seeded PRNG (mulberry32) so difficulty is deterministic per level
// instead of using Math.random(), which made difficulty change on every reload.
function mulberry32(seed: number) {
  let t = seed;
  return function () {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const KNIFE_LEVELS: KnifeLevel[] = Array.from({ length: 100 }).map((_, i) => {
  const levelId = i + 1;
  const isBoss = levelId % 10 === 0; // Boss every 10 levels
  const rand = mulberry32(levelId * 9781 + 17); // deterministic per-level RNG

  // ---- Knives to throw: same gentle progression, capped a bit lower ----
  let knivesToThrow = 5 + Math.floor((levelId - 1) / 3);
  if (isBoss) knivesToThrow += 2;
  if (knivesToThrow > 11) knivesToThrow = 11; // was 12, small breathing room

  // ---- Base speed: slower growth, lower cap ----
  // Old: 0.02 + i*0.0015, cap 0.12  -> ramped up way too fast
  let baseSpeed = 0.018 + i * 0.0009;
  if (baseSpeed > 0.085) baseSpeed = 0.085;

  // ---- Pre-stuck knives: introduced later, spread evenly, avoid the top gap ----
  let preStuckKnives: number[] = [];
  if (levelId >= 5) {
    // grows slower: 1 knife every ~8 levels, max 4 (was max 3 starting level 3)
    let numPreStuck = Math.min(Math.floor((levelId - 5) / 8) + 1, 4);
    if (isBoss) numPreStuck = Math.min(numPreStuck, 2); // boss stays about speed, not clutter

    const totalSlots = numPreStuck + 3; // more empty slots = more room to land safely
    for (let j = 0; j < numPreStuck; j++) {
      // offset by half a slot so a stuck knife never sits exactly at the entry angle (0)
      preStuckKnives.push((Math.PI * 2 * (j + 0.5)) / totalSlots);
    }
  }

  // ---- Speed change patterns: cycle through distinct "feels" for variety ----
  let changeIntervals: { duration: number; speed: number }[] | undefined = undefined;

  if (isBoss) {
    // Boss: still dramatic, but multiplier ceiling brought down from 3.0x -> 2.2x
    changeIntervals = [
      { duration: 45, speed: baseSpeed * 2.0 },
      { duration: 35, speed: baseSpeed * 0.5 },
      { duration: 45, speed: baseSpeed * 2.2 },
      { duration: 30, speed: baseSpeed * 0.35 },
      { duration: 35, speed: baseSpeed * 1.4 },
    ];
  } else if (levelId <= 9) {
    // Levels 1-9: no surprises yet, just constant speed to let players learn controls
    changeIntervals = undefined;
  } else {
    // Cycle through 4 pattern "flavors" so consecutive levels don't feel the same
    const patternType = Math.floor((levelId - 10) / 5) % 4;

    if (patternType === 0) {
      // PULSE: steady alternation between a bit faster and a bit slower
      changeIntervals = [
        { duration: 40, speed: baseSpeed * 1.3 },
        { duration: 40, speed: baseSpeed * 0.75 },
        { duration: 40, speed: baseSpeed * 1.3 },
        { duration: 40, speed: baseSpeed * 0.75 },
      ];
    } else if (patternType === 1) {
      // WAVE: smooth ramp up then down, like a sine sweep
      changeIntervals = [
        { duration: 30, speed: baseSpeed * 0.8 },
        { duration: 30, speed: baseSpeed * 1.1 },
        { duration: 30, speed: baseSpeed * 1.5 },
        { duration: 30, speed: baseSpeed * 1.1 },
        { duration: 30, speed: baseSpeed * 0.8 },
      ];
    } else if (patternType === 2) {
      // BURST: one short sharp burst, then a long calm recovery window
      changeIntervals = [
        { duration: 20, speed: baseSpeed * 1.8 },
        { duration: 70, speed: baseSpeed * 0.7 },
        { duration: 20, speed: baseSpeed * 1.8 },
      ];
    } else {
      // CHAOS: irregular but seeded (same every playthrough), tamer range than before
      changeIntervals = [];
      const numIntervals = 3 + (levelId % 3); // 3 to 5 intervals
      for (let j = 0; j < numIntervals; j++) {
        const isFast = rand() > 0.5;
        const speedMult = isFast ? 1.2 + rand() * 0.6 : 0.4 + rand() * 0.4; // was up to 2.5x/0.2x
        const duration = 25 + Math.floor(rand() * 45);
        changeIntervals.push({ duration, speed: baseSpeed * speedMult });
      }
    }
  }

  return {
    id: levelId,
    knivesToThrow,
    rotationSpeed: baseSpeed,
    changeIntervals,
    preStuckKnives,
  };
});