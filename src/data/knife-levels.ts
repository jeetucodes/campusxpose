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
  
  // Progressive difficulty for knives to throw
  let knivesToThrow = 5 + Math.floor((levelId - 1) / 3); 
  if (isBoss) knivesToThrow += 2; // Boss levels require more knives
  if (knivesToThrow > 12) knivesToThrow = 12; // Cap at 12 to prevent UI overflow

  // Speed increases
  let baseSpeed = 0.02 + (i * 0.0015);
  if (baseSpeed > 0.12) baseSpeed = 0.12;
  
  let preStuckKnives: number[] = [];
  let changeIntervals: { duration: number; speed: number }[] | undefined = undefined;

  // Add pre-stuck knives progressively but keep it low
  if (levelId >= 3) {
    let numPreStuck = Math.min(Math.floor((levelId - 1) / 5), 3); // Max 3 knives on any level
    if (isBoss) numPreStuck = 1; // Boss levels rely on crazy speed, not clutter
    
    // Spread them out evenly but skip some spots
    const totalSlots = numPreStuck + 2; 
    for (let j = 0; j < numPreStuck; j++) {
      preStuckKnives.push((Math.PI * 2 * j) / totalSlots);
    }
  }

  // Erratic speeds (forward only, to ensure 360 degree rotation)
  // We use multipliers like 0.2 to 2.5 to make it irregular but always moving
  if (isBoss) {
    changeIntervals = [
      { duration: 40, speed: baseSpeed * 2.5 },
      { duration: 30, speed: baseSpeed * 0.5 },
      { duration: 50, speed: baseSpeed * 3.0 },
      { duration: 25, speed: baseSpeed * 0.2 },
      { duration: 30, speed: baseSpeed * 1.5 },
    ];
  } else {
    // Generate random irregular intervals for every level
    changeIntervals = [];
    const numIntervals = 3 + (levelId % 4); // 3 to 6 intervals
    for (let j = 0; j < numIntervals; j++) {
       const isFast = Math.random() > 0.5;
       const speedMult = isFast ? (1.2 + Math.random() * 1.5) : (0.2 + Math.random() * 0.6);
       const duration = 20 + Math.floor(Math.random() * 60);
       changeIntervals.push({ duration, speed: baseSpeed * speedMult });
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

