export interface KnifeLevel {
  id: number;
  knivesToThrow: number;
  rotationSpeed: number; // base speed in radians per frame
  changeIntervals?: { duration: number; speed: number }[]; // optional sequence of speed changes
  preStuckKnives: number[]; // angles in radians
}

export const KNIFE_LEVELS: KnifeLevel[] = Array.from({ length: 100 }).map((_, i) => {
  const levelId = i + 1;
  const isBoss = levelId % 10 === 0; // Boss every 10 levels
  
  // Base knives scales up slowly
  let knivesToThrow = 5 + Math.floor(i / 8); 
  if (isBoss) knivesToThrow += 3;
  if (knivesToThrow > 15) knivesToThrow = 15; // Cap knives so it's not impossible

  // Speed increases
  let baseSpeed = 0.02 + (i * 0.0015);
  if (baseSpeed > 0.12) baseSpeed = 0.12;
  
  let preStuckKnives: number[] = [];
  let changeIntervals: { duration: number; speed: number }[] | undefined = undefined;

  // Add pre-stuck knives progressively
  if (levelId >= 3) {
    let numPreStuck = Math.min(Math.floor(levelId / 3), 9);
    if (isBoss) numPreStuck = 2; // Boss levels have fewer pre-stuck, rely on crazy speed
    
    // Spread them out evenly but skip some spots
    const totalSlots = numPreStuck + 2; 
    for (let j = 0; j < numPreStuck; j++) {
      preStuckKnives.push((Math.PI * 2 * j) / totalSlots);
    }
  }

  // Erratic speeds (starting early to make it harder as requested)
  if (levelId >= 3) {
    if (isBoss) {
      changeIntervals = [
        { duration: Math.max(15, 40 - i), speed: baseSpeed * 1.8 },
        { duration: 15, speed: 0 },
        { duration: Math.max(20, 50 - i), speed: -baseSpeed * 2.2 },
        { duration: 25, speed: 0 },
        { duration: 30, speed: baseSpeed * 1.5 },
      ];
    } else if (levelId % 5 === 0) {
      changeIntervals = [
        { duration: 60, speed: baseSpeed * 1.5 },
        { duration: 40, speed: -baseSpeed * 1.5 },
        { duration: 20, speed: baseSpeed * 2.2 },
        { duration: 30, speed: -baseSpeed * 2 },
      ];
    } else if (levelId % 4 === 0) {
      changeIntervals = [
        { duration: Math.max(30, 80 - i*2), speed: baseSpeed * 1.3 },
        { duration: 15, speed: 0 },
        { duration: Math.max(25, 60 - i), speed: -baseSpeed * 1.6 },
      ];
    } else if (levelId % 3 === 0) {
      changeIntervals = [
        { duration: 70, speed: baseSpeed * 1.4 },
        { duration: 25, speed: baseSpeed * 0.1 }, // dramatic slow down
        { duration: 30, speed: baseSpeed * 2.0 }, // sudden burst
      ];
    } else if (levelId % 2 === 0 && levelId > 8) {
       changeIntervals = [
        { duration: 50, speed: baseSpeed * 1.3 },
        { duration: 40, speed: -baseSpeed * 0.8 },
        { duration: 35, speed: baseSpeed * 1.7 },
      ];
    } else if (levelId > 12) {
       // Even normal levels get crazy after 12
       changeIntervals = [
        { duration: 45, speed: baseSpeed * (1 + (levelId%3)*0.3) },
        { duration: 25, speed: -baseSpeed * (1 + (levelId%2)*0.4) },
        { duration: 40, speed: baseSpeed * 1.6 },
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
