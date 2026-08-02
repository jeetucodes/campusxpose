export type TargetMovement = "static" | "slide-h" | "slide-v" | "rotate";
export type RingType = "teal" | "yellow" | "red" | "bullseye";
export type TrajectoryPreview = "full" | "half" | "none";

export interface Obstacle {
  id: string;
  type: "pole" | "board" | "shutter";
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // pixels
  height: number; // pixels
  rotation?: number; // degrees
  shutterTiming?: { openDuration: number; closeDuration: number; offset: number }; // ms
}

export interface Wind {
  enabled: boolean;
  strength: number; // -10 to 10
}

export interface GustZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strength: number;
}

export interface LevelData {
  id: number;
  targetDistance: number; // 0-100 (horizontal distance)
  targetY: number; // 0-100 (vertical placement)
  targetSize: number; // Multiplier, e.g. 1.0, 0.8
  arrowsGiven: number;
  wind: Wind;
  gustZones: GustZone[];
  targetMovement: TargetMovement;
  movementSpeed: number; // multiplier
  obstacles: Obstacle[];
  requiredRing: RingType;
  trajectoryPreview: TrajectoryPreview;
}

const RNG = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    return (s = (s * 16807) % 2147483647) / 2147483647;
  };
};

export function getStaticLevel(levelNum: number): LevelData {
  // levelNum is 1-indexed (1 to 50)
  const rand = RNG(levelNum * 1337);
  
  let targetDistance = 40 + (levelNum / 50) * 50; // 40% to 90%
  let targetY = 30 + rand() * 50; // 30% to 80%
  let targetSize = 1.0;
  let arrowsGiven = 5;
  let wind: Wind = { enabled: false, strength: 0 };
  let gustZones: GustZone[] = [];
  let targetMovement: TargetMovement = "static";
  let movementSpeed = 0;
  let obstacles: Obstacle[] = [];
  let requiredRing: RingType = "yellow";
  let trajectoryPreview: TrajectoryPreview = "full";

  // Tier 1: Levels 1-8 (Tutorial)
  if (levelNum <= 8) {
    targetDistance = 40 + rand() * 20;
    targetY = 40 + rand() * 20;
    arrowsGiven = 5 + Math.floor(rand() * 2);
    requiredRing = "yellow";
    trajectoryPreview = "full";
  }
  // Tier 2: Levels 9-18 (Easy-Medium)
  else if (levelNum <= 18) {
    targetDistance = 50 + rand() * 30;
    arrowsGiven = 4 + Math.floor(rand() * 2);
    requiredRing = "red";
    trajectoryPreview = "half";
    wind = {
      enabled: true,
      strength: (rand() > 0.5 ? 1 : -1) * (2 + rand() * 3)
    };
  }
  // Tier 3: Levels 19-30 (Medium)
  else if (levelNum <= 30) {
    targetDistance = 60 + rand() * 30;
    arrowsGiven = 3 + Math.floor(rand() * 2);
    trajectoryPreview = "none";
    requiredRing = levelNum > 25 ? "bullseye" : "red";
    targetSize = 0.9;
    
    // 50% movement + wind, 50% just movement or obstacles
    if (rand() > 0.5) {
      wind = { enabled: true, strength: (rand() > 0.5 ? 1 : -1) * (3 + rand() * 4) };
    }
    targetMovement = rand() > 0.5 ? "slide-v" : "slide-h";
    movementSpeed = 0.5 + rand() * 1.5;

    // Add 1 obstacle
    obstacles.push({
      id: "obs-1",
      type: "pole",
      x: 30 + rand() * 30, // Between bow (0) and target (60-90)
      y: 30 + rand() * 60,
      width: 20,
      height: 200 + rand() * 100
    });
  }
  // Tier 4: Levels 31-40 (Hard)
  else if (levelNum <= 40) {
    targetDistance = 70 + rand() * 25;
    arrowsGiven = 3;
    trajectoryPreview = "none";
    requiredRing = "bullseye";
    targetSize = 0.8;
    
    wind = { enabled: true, strength: (rand() > 0.5 ? 1 : -1) * (5 + rand() * 5) };
    targetMovement = rand() > 0.5 ? "rotate" : (rand() > 0.5 ? "slide-v" : "slide-h");
    movementSpeed = 1.0 + rand() * 2.0;

    // Gust zones
    if (rand() > 0.3) {
      gustZones.push({
        id: "gust-1",
        x: 40 + rand() * 20,
        y: 20 + rand() * 60,
        width: 100,
        height: 150,
        strength: (rand() > 0.5 ? 1 : -1) * (10 + rand() * 10)
      });
    }

    // 1-2 obstacles
    obstacles.push({
      id: "obs-1",
      type: rand() > 0.5 ? "board" : "pole",
      x: 30 + rand() * 40,
      y: 20 + rand() * 60,
      width: rand() > 0.5 ? 150 : 20,
      height: rand() > 0.5 ? 20 : 150
    });
  }
  // Tier 5: Levels 41-50 (Expert)
  else {
    targetDistance = 80 + rand() * 15;
    arrowsGiven = levelNum === 50 ? 5 : 2;
    trajectoryPreview = "none";
    requiredRing = "bullseye";
    targetSize = 0.7; // Very small target
    
    wind = { enabled: true, strength: (rand() > 0.5 ? 1 : -1) * (7 + rand() * 8) };
    targetMovement = levelNum === 50 ? "rotate" : (rand() > 0.5 ? "slide-v" : "slide-h");
    movementSpeed = 2.0 + rand() * 2.0;

    // Time shutter
    if (rand() > 0.4 || levelNum === 50) {
      obstacles.push({
        id: "shutter-1",
        type: "shutter",
        x: targetDistance - 5, // Just in front of target
        y: targetY,
        width: 20,
        height: 150,
        shutterTiming: {
          openDuration: 1000 + rand() * 1000,
          closeDuration: 1000 + rand() * 1000,
          offset: rand() * 1000
        }
      });
    }

    obstacles.push({
      id: "obs-1",
      type: "pole",
      x: 40 + rand() * 20,
      y: rand() > 0.5 ? 20 : 80,
      width: 20,
      height: 250
    });
  }

  return {
    id: levelNum,
    targetDistance,
    targetY,
    targetSize,
    arrowsGiven,
    wind,
    gustZones,
    targetMovement,
    movementSpeed,
    obstacles,
    requiredRing,
    trajectoryPreview
  };
}
