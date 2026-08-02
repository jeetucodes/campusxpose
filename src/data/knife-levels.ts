export interface KnifeLevel {
  id: number;
  knivesToThrow: number;
  rotationSpeed: number; // base speed in radians per frame
  changeIntervals?: { duration: number; speed: number }[]; // optional sequence of speed changes
  preStuckKnives: number[]; // angles in radians
}

export const KNIFE_LEVELS: KnifeLevel[] = Array.from({ length: 100 }).map((_, i) => {
  const levelId = i + 1;
  const isBoss = levelId % 5 === 0;

  let knivesToThrow = 5 + Math.floor(i / 5);
  let baseSpeed = 0.02 + (i * 0.001);
  let preStuckKnives: number[] = [];
  let changeIntervals: { duration: number; speed: number }[] | undefined = undefined;

  // Add some pre-stuck knives
  if (levelId > 3) {
    const numPreStuck = Math.min(Math.floor(levelId / 4), 4);
    for (let j = 0; j < numPreStuck; j++) {
      preStuckKnives.push((Math.PI * 2 * j) / numPreStuck);
    }
  }

  // Add rotation changes for higher levels
  if (levelId > 10) {
    if (isBoss) {
      // Boss levels are erratic
      changeIntervals = [
        { duration: 60, speed: baseSpeed * 1.5 },
        { duration: 20, speed: 0 },
        { duration: 60, speed: -baseSpeed * 1.5 },
        { duration: 40, speed: baseSpeed * 0.5 },
      ];
      knivesToThrow += 2;
    } else if (levelId % 3 === 0) {
      changeIntervals = [
        { duration: 100, speed: baseSpeed },
        { duration: 100, speed: -baseSpeed },
      ];
    } else if (levelId % 4 === 0) {
      changeIntervals = [
        { duration: 80, speed: baseSpeed },
        { duration: 30, speed: baseSpeed * 2 },
      ];
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
