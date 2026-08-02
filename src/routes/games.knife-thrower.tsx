import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Heart, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordGameSession } from "../lib/gameAnalytics";
import { KNIFE_LEVELS, KnifeLevel } from "../data/knife-levels";
import HintRewardAdModal from "@/components/HintRewardAdModal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
export const Route = createFileRoute("/games/knife-thrower")({
  head: () => ({
    meta: [
      { title: "Knife Thrower — CampusXpose Games" },
      {
        name: "description",
        content: "Tap to throw knives, hit the log, avoid other knives!",
      },
    ],
  }),
  component: KnifeThrowerGame,
});

const LOGICAL_WIDTH = 500;
const LOGICAL_HEIGHT = 900;
const LOG_X = 250;
const LOG_Y = 300;
const LOG_RADIUS = 100;
const KNIFE_WIDTH = 12;
const KNIFE_HEIGHT = 60;
const KNIFE_START_Y = 700;

interface ThemeConfig {
   bgStyle: string;
   targetType: "wood" | "orange" | "kiwi" | "peppermint";
   knifePrimary: string;
   knifeSecondary: string;
   knifeHandle: string;
}

const getThemeForLevel = (levelId: number): ThemeConfig => {
   const mod = (levelId - 1) % 4;
   if (mod === 1) return { bgStyle: "linear-gradient(to bottom, #4c1d95, #2e1065, #000000)", targetType: "orange", knifePrimary: "#fde047", knifeSecondary: "#eab308", knifeHandle: "#1e3a8a" }; // desert
   if (mod === 2) return { bgStyle: "linear-gradient(to bottom, #14b8a6, #0f766e, #042f2e)", targetType: "peppermint", knifePrimary: "#a5f3fc", knifeSecondary: "#06b6d4", knifeHandle: "#0f172a" }; // candy
   if (mod === 3) return { bgStyle: "linear-gradient(to bottom, #166534, #14532d, #064e3b)", targetType: "kiwi", knifePrimary: "#86efac", knifeSecondary: "#22c55e", knifeHandle: "#064e3b" }; // jungle
   return { bgStyle: "linear-gradient(to bottom, #1e3a8a, #312e81, #0f172a)", targetType: "wood", knifePrimary: "#cbd5e1", knifeSecondary: "#94a3b8", knifeHandle: "#78350f" }; // forest
};
const KNIFE_SPEED = 60;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  isAppleHalf?: "left" | "right";
  rotation?: number;
  rotSpeed?: number;
}

interface LogCoin {
  angle: number;
  collected: boolean;
}

interface LogApple {
  angle: number;
  sliced: boolean;
}

// Simple Web Audio API Synth
const playSynth = (type: "wood" | "metal" | "throw" | "win" | "coin" | "slice", isMuted: boolean) => {
  if (isMuted) return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === "throw") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === "wood") {
      osc.type = "square";
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === "metal") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === "coin") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.setValueAtTime(1600, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === "slice") {
      // White noise / sharp slice sound
      const bufferSize = audioCtx.sampleRate * 0.1; 
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 1000;
      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      noise.start();
    } else if (type === "win") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
      osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
  } catch (e) {
    // Ignore audio errors
  }
};

const triggerVibration = (pattern: number | number[]) => {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
};

export default function KnifeThrowerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [levelIdx, setLevelIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const [gameState, setGameState] = useState<"playing" | "won" | "lost" | "ad_offer">("playing");
  const [score, setScore] = useState(0);
  const [knivesLeft, setKnivesLeft] = useState(0);
  const [lives, setLives] = useState(3);
  const [coins, setCoins] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [highestUnlocked, setHighestUnlocked] = useState(0);
  const [showLevels, setShowLevels] = useState(false);
  const [hasUsedRevive, setHasUsedRevive] = useState(false);
  
  const theme = getThemeForLevel(levelIdx + 1);

  const stateRef = useRef({
    logAngle: 0,
    stuckKnives: [] as number[],
    logCoins: [] as LogCoin[],
    logApples: [] as LogApple[],
    flyingKnife: null as { y: number } | null,
    particles: [] as Particle[],
    levelFrames: 0,
    speedModifier: 1,
  });

  const level = KNIFE_LEVELS[levelIdx] || KNIFE_LEVELS[KNIFE_LEVELS.length - 1];

  const initLevel = useCallback((lvl: KnifeLevel) => {
    // Generate some random coins around the edge of the log (up to 4)
    const newLogCoins: LogCoin[] = [];
    const newLogApples: LogApple[] = [];
    
    // Spawn 1-2 coins and 1-2 apples
    const numCoins = Math.floor(Math.random() * 2) + 1;
    const numApples = Math.floor(Math.random() * 2) + 1; 
    const totalItems = numCoins + numApples;
    
    // Find safe spots for items avoiding preStuckKnives
    let attempts = 0;
    let spawnedItems = 0;
    while (spawnedItems < totalItems && attempts < 50) {
       const candidateAngle = Math.random() * Math.PI * 2;
       let safe = true;
       // Check against preStuckKnives
       for (const stuck of lvl.preStuckKnives) {
          const diff = Math.abs(stuck - candidateAngle);
          const wrapDiff = Math.min(diff, Math.PI * 2 - diff);
          if (wrapDiff < 0.4) { // keep distance from knives
             safe = false;
             break;
          }
       }
       // Check against other coins/apples
       if (safe) {
          const allItems = [...newLogCoins.map(c=>c.angle), ...newLogApples.map(a=>a.angle)];
          for (const itemAngle of allItems) {
             const diff = Math.abs(itemAngle - candidateAngle);
             const wrapDiff = Math.min(diff, Math.PI * 2 - diff);
             if (wrapDiff < 0.4) {
                safe = false;
                break;
             }
          }
       }
       
       if (safe) {
          if (newLogCoins.length < numCoins) {
             newLogCoins.push({ angle: candidateAngle, collected: false });
          } else {
             newLogApples.push({ angle: candidateAngle, sliced: false });
          }
          spawnedItems++;
       }
       attempts++;
    }

    stateRef.current = {
      logAngle: 0,
      stuckKnives: [...lvl.preStuckKnives],
      logCoins: newLogCoins,
      logApples: newLogApples,
      flyingKnife: null,
      particles: [],
      levelFrames: 0,
      speedModifier: 1,
    };
    setKnivesLeft(lvl.knivesToThrow);
    setHasUsedRevive(false);
    setGameState("playing");
  }, []);

  // Initialization
  useEffect(() => {
    const savedLevel = parseInt(localStorage.getItem("cx_knife_level") || "0", 10);
    setLevelIdx(Math.min(savedLevel, KNIFE_LEVELS.length - 1));
    const maxLvl = parseInt(localStorage.getItem("cx_knife_max_level") || "0", 10);
    setHighestUnlocked(maxLvl);
    const savedMute = localStorage.getItem("cx_knife_mute") === "true";
    setIsMuted(savedMute);
    const savedCoins = parseInt(localStorage.getItem("cx_knife_coins") || "0", 10);
    setCoins(savedCoins);
  }, []);

  useEffect(() => {
    if (KNIFE_LEVELS[levelIdx]) {
      initLevel(KNIFE_LEVELS[levelIdx]);
    }
  }, [levelIdx, initLevel]);

  const handleShoot = () => {
    if (gameState !== "playing") return;
    if (stateRef.current.flyingKnife !== null) return; // already throwing
    if (knivesLeft <= 0) return;

    stateRef.current.flyingKnife = { y: KNIFE_START_Y };
    playSynth("throw", isMuted);
  };

  const nextLevel = () => {
    const next = Math.min(levelIdx + 1, KNIFE_LEVELS.length - 1);
    localStorage.setItem("cx_knife_level", next.toString());
    setLevelIdx(next);
  };

  const restartLevel = () => {
    setLives(3);
    setScore(0);
    setLevelIdx(0);
    localStorage.setItem("cx_knife_level", "0");
    initLevel(KNIFE_LEVELS[0]);
  };

  const createParticles = (x: number, y: number, color: string, amount: number = 15) => {
    const p: Particle[] = [];
    for (let i = 0; i < amount; i++) {
      p.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 0,
        maxLife: 20 + Math.random() * 20,
        color,
      });
    }
    stateRef.current.particles.push(...p);
  };

  const createAppleHalves = (x: number, y: number) => {
    stateRef.current.particles.push(
       { x, y, vx: -5, vy: -5, life: 0, maxLife: 60, color: "apple", isAppleHalf: "left", rotation: 0, rotSpeed: -0.1 },
       { x, y, vx: 5, vy: -5, life: 0, maxLife: 60, color: "apple", isAppleHalf: "right", rotation: 0, rotSpeed: 0.1 },
       // Add some juice particles
       ...Array.from({length: 10}).map(() => ({
          x, y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 0, maxLife: 30, color: "#fef08a"
       }))
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const state = stateRef.current;
      
      // Update logic
      if (gameState === "playing") {
        state.levelFrames++;
        
        let currentSpeed = level.rotationSpeed;
        if (level.changeIntervals && level.changeIntervals.length > 0) {
          let cycleFrames = level.changeIntervals.reduce((sum, int) => sum + int.duration, 0);
          let currentFrameInCycle = state.levelFrames % cycleFrames;
          let accum = 0;
          for (const interval of level.changeIntervals) {
            accum += interval.duration;
            if (currentFrameInCycle < accum) {
              currentSpeed = interval.speed;
              break;
            }
          }
        }
        
        state.logAngle += currentSpeed;

        if (state.flyingKnife) {
          state.flyingKnife.y -= KNIFE_SPEED;

          // Check collision with log
          if (state.flyingKnife.y <= LOG_Y + LOG_RADIUS - 10) {
            const hitAngle = -state.logAngle;
            const normalizedHit = hitAngle % (Math.PI * 2);
            const finalHit = normalizedHit < 0 ? normalizedHit + Math.PI * 2 : normalizedHit;
            
            // Check collision with stuck knives
            let hitMetal = false;
            for (const stuck of state.stuckKnives) {
              const diff = Math.abs(stuck - finalHit);
              const wrapDiff = Math.min(diff, Math.PI * 2 - diff);
              if (wrapDiff < 0.25) { // Collision threshold
                hitMetal = true;
                break;
              }
            }

            // Check collision with coins
            for (const coin of state.logCoins) {
               if (!coin.collected) {
                  const diff = Math.abs(coin.angle - finalHit);
                  const wrapDiff = Math.min(diff, Math.PI * 2 - diff);
                  if (wrapDiff < 0.3) {
                     coin.collected = true;
                     setCoins(prev => {
                        const newCoins = prev + 1;
                        localStorage.setItem("cx_knife_coins", String(newCoins));
                        return newCoins;
                     });
                     playSynth("coin", isMuted);
                     createParticles(LOG_X, LOG_Y + LOG_RADIUS, "#fbbf24", 10);
                  }
               }
            }

            // Check collision with apples
            for (const apple of state.logApples) {
               if (!apple.sliced) {
                  const diff = Math.abs(apple.angle - finalHit);
                  const wrapDiff = Math.min(diff, Math.PI * 2 - diff);
                  if (wrapDiff < 0.3) {
                     apple.sliced = true;
                     setScore(prev => prev + 20); // extra points for apple
                     playSynth("slice", isMuted);
                     // Spawn apple halves falling down
                     // To get absolute screen coordinates for the apple:
                     // The hit is always at the bottom of the log when finalHit is 0.
                     // But wait, the apple was sliced exactly AT the hit point, so it's at (LOG_X, LOG_Y + LOG_RADIUS)
                     createAppleHalves(LOG_X, LOG_Y + LOG_RADIUS + 15);
                  }
               }
            }

            if (hitMetal) {
              // Game Over / Lose Life
              playSynth("metal", isMuted);
              triggerVibration([100, 50, 100]);
              createParticles(LOG_X, LOG_Y + LOG_RADIUS, "#94a3b8", 30);
              
              setLives((prevLives) => {
                 const newLives = prevLives - 1;
                 if (newLives <= 0) {
                    if (hasUsedRevive) {
                       setGameState("lost");
                    } else {
                       setGameState("ad_offer");
                       setShowAdModal(true);
                    }
                 }
                 return newLives;
              });
              
              state.flyingKnife = null;
            } else {
              // Stick to log
              playSynth("wood", isMuted);
              triggerVibration([30]);
              state.stuckKnives.push(finalHit);
              createParticles(LOG_X, LOG_Y + LOG_RADIUS, "#d97706", 15);
              state.flyingKnife = null;
              
              setKnivesLeft((prev) => {
                const next = prev - 1;
                setScore((s) => s + 10);
                if (next <= 0) {
                  // Win Level
                  setTimeout(() => {
                    playSynth("win", isMuted);
                    triggerVibration([50, 50, 50]);
                    setGameState("won");
                    createParticles(LOG_X, LOG_Y, "#fde047", 100); // big explosion
                    recordGameSession("knife-thrower", 1, levelIdx + 1);
                    
                    const nextLvl = levelIdx + 1;
                    setHighestUnlocked(prev => {
                       const newMax = Math.max(prev, nextLvl);
                       localStorage.setItem("cx_knife_max_level", newMax.toString());
                       return newMax;
                    });
                    
                    // Give coins for winning
                    setCoins((c) => {
                       const nc = c + 10 + Math.floor(score/50);
                       localStorage.setItem("cx_knife_coins", nc.toString());
                       return nc;
                    });
                  }, 300);
                }
                return next;
              });
            }
          }
        }
      }

      // Update particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        // Gravity for apple halves
        if (p.isAppleHalf) {
           p.vy += 0.5; // gravity
           if(p.rotation !== undefined && p.rotSpeed) p.rotation += p.rotSpeed;
        }
        
        p.life++;
        if (p.life >= p.maxLife) {
          state.particles.splice(i, 1);
        }
      }

      // Draw
      ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Background - Dark purple/blue gradient matching screenshot
      const bgGrad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
      bgGrad.addColorStop(0, "#271b4a"); // Top purple
      bgGrad.addColorStop(0.6, "#1e3a8a"); // Mid blue
      bgGrad.addColorStop(1, "#0f172a"); // Bottom dark
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Draw speed lines / rays from center
      ctx.save();
      ctx.translate(LOG_X, LOG_Y);
      ctx.globalAlpha = 0.05;
      for (let i = 0; i < 12; i++) {
        ctx.rotate((Math.PI * 2) / 12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-50, LOGICAL_HEIGHT);
        ctx.lineTo(50, LOGICAL_HEIGHT);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
      ctx.restore();

      // Silhouettes at bottom (trees/mountains)
      ctx.fillStyle = "#1e1b4b";
      ctx.beginPath();
      ctx.moveTo(0, LOGICAL_HEIGHT);
      ctx.lineTo(0, LOGICAL_HEIGHT - 100);
      for(let i=1; i<=10; i++) {
         ctx.lineTo((LOGICAL_WIDTH/10) * i, LOGICAL_HEIGHT - 100 + Math.sin(i*123) * 30);
      }
      ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.fill();

      // Draw Target Base (Log or Other)
      ctx.save();
      ctx.translate(LOG_X, LOG_Y);
      ctx.rotate(state.logAngle);

      if (theme.targetType === "wood") {
         ctx.beginPath();
         ctx.arc(0, 0, LOG_RADIUS, 0, Math.PI * 2);
         ctx.fillStyle = "#78350f";
         ctx.fill();
         ctx.beginPath();
         ctx.arc(0, 0, LOG_RADIUS - 10, 0, Math.PI * 2);
         ctx.fillStyle = "#d97706";
         ctx.fill();
         ctx.strokeStyle = "#92400e";
         ctx.lineWidth = 2;
         for (let r = 20; r < LOG_RADIUS - 15; r += 15) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
         }
      } else if (theme.targetType === "orange") {
         ctx.beginPath();
         ctx.arc(0, 0, LOG_RADIUS, 0, Math.PI * 2);
         ctx.fillStyle = "#ea580c";
         ctx.fill();
         ctx.beginPath();
         ctx.arc(0, 0, LOG_RADIUS - 5, 0, Math.PI * 2);
         ctx.fillStyle = "#f97316";
         ctx.fill();
         ctx.strokeStyle = "#fff7ed";
         ctx.lineWidth = 4;
         for (let i = 0; i < 8; i++) {
             ctx.beginPath();
             ctx.moveTo(0, 0);
             const a = (Math.PI * 2 * i) / 8;
             ctx.lineTo(Math.cos(a) * (LOG_RADIUS - 5), Math.sin(a) * (LOG_RADIUS - 5));
             ctx.stroke();
         }
         ctx.beginPath();
         ctx.arc(0, 0, 10, 0, Math.PI * 2);
         ctx.fillStyle = "#fff7ed";
         ctx.fill();
      } else if (theme.targetType === "peppermint") {
         ctx.beginPath();
         ctx.arc(0, 0, LOG_RADIUS, 0, Math.PI * 2);
         ctx.fillStyle = "#fdf2f8";
         ctx.fill();
         ctx.fillStyle = "#ec4899";
         for (let i = 0; i < 8; i++) {
             ctx.beginPath();
             ctx.moveTo(0, 0);
             const a1 = (Math.PI * 2 * i) / 8;
             const a2 = (Math.PI * 2 * (i + 0.5)) / 8;
             ctx.arc(0, 0, LOG_RADIUS, a1, a2);
             ctx.lineTo(0, 0);
             ctx.fill();
         }
      } else if (theme.targetType === "kiwi") {
         ctx.beginPath();
         ctx.arc(0, 0, LOG_RADIUS, 0, Math.PI * 2);
         ctx.fillStyle = "#78350f";
         ctx.fill();
         ctx.beginPath();
         ctx.arc(0, 0, LOG_RADIUS - 6, 0, Math.PI * 2);
         ctx.fillStyle = "#84cc16";
         ctx.fill();
         ctx.beginPath();
         ctx.arc(0, 0, 15, 0, Math.PI * 2);
         ctx.fillStyle = "#ecfccb";
         ctx.fill();
         ctx.fillStyle = "#1c1917";
         for (let i = 0; i < 16; i++) {
            const a = (Math.PI * 2 * i) / 16;
            const dist = 25 + Math.random() * 10;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, 2.5, 0, Math.PI * 2);
            ctx.fill();
         }
      }

      // Draw Coins on log
      for (const coin of state.logCoins) {
         if (!coin.collected) {
            ctx.save();
            ctx.rotate(coin.angle);
            ctx.translate(0, LOG_RADIUS + 15); // float just outside, aligned to bottom
            // Coin bg
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fillStyle = "#fbbf24"; // yellow
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#b45309";
            ctx.stroke();
            // Coin inner S
            ctx.fillStyle = "#f59e0b";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("$", 0, 0);
            ctx.restore();
         }
      }

      // Draw Apples on log
      for (const apple of state.logApples) {
         if (!apple.sliced) {
            ctx.save();
            ctx.rotate(apple.angle);
            ctx.translate(0, LOG_RADIUS + 15); 
            // Draw full apple
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fillStyle = "#ef4444"; // red apple
            ctx.fill();
            // inner shine
            ctx.beginPath();
            ctx.arc(-4, -4, 4, 0, Math.PI*2);
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.fill();
            // stem
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.quadraticCurveTo(5, -18, 8, -15);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#166534";
            ctx.stroke();
            // leaf
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.quadraticCurveTo(-10, -15, -8, -8);
            ctx.quadraticCurveTo(-4, -5, 0, -12);
            ctx.fillStyle = "#22c55e";
            ctx.fill();
            ctx.restore();
         }
      }

      // Draw stuck knives
      for (const angle of state.stuckKnives) {
        ctx.save();
        ctx.rotate(angle);
        ctx.translate(0, LOG_RADIUS - 10);
        drawKnife(ctx, true);
        ctx.restore();
      }
      ctx.restore();

      // Draw flying knife
      if (state.flyingKnife) {
        ctx.save();
        ctx.translate(LOG_X, state.flyingKnife.y);
        ctx.rotate(0);
        drawKnife(ctx, false);
        ctx.restore();
      }

      // Draw waiting knife at bottom
      if (gameState === "playing" && knivesLeft > 0 && !state.flyingKnife) {
        ctx.save();
        ctx.translate(LOG_X, KNIFE_START_Y);
        drawKnife(ctx, false);
        ctx.restore();
      }

      // Particles (including apple halves)
      for (const p of state.particles) {
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        
        if (p.isAppleHalf) {
           ctx.save();
           ctx.translate(p.x, p.y);
           if(p.rotation) ctx.rotate(p.rotation);
           
           ctx.fillStyle = "#ef4444"; // red shell
           ctx.beginPath();
           if (p.isAppleHalf === "left") {
              ctx.arc(0, 0, 14, Math.PI/2, Math.PI*1.5);
           } else {
              ctx.arc(0, 0, 14, -Math.PI/2, Math.PI/2);
           }
           ctx.fill();
           // Inner core
           ctx.fillStyle = "#fef08a";
           ctx.beginPath();
           if (p.isAppleHalf === "left") {
              ctx.arc(0, 0, 10, Math.PI/2, Math.PI*1.5);
           } else {
              ctx.arc(0, 0, 10, -Math.PI/2, Math.PI/2);
           }
           ctx.fill();
           
           ctx.restore();
        } else {
           ctx.fillStyle = p.color;
           ctx.beginPath();
           ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
           ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    const drawKnife = (ctx: CanvasRenderingContext2D, isStuck: boolean) => {
      // Draw centered around (0,0) facing UP
      
      const bladeGrad = ctx.createLinearGradient(0, -KNIFE_HEIGHT/2, 0, 0);
      bladeGrad.addColorStop(0, theme.knifePrimary);
      bladeGrad.addColorStop(0.5, theme.knifeSecondary);
      bladeGrad.addColorStop(1, theme.knifeHandle);

      // Blade Main Shape
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(0, -KNIFE_HEIGHT / 2); // Sharp tip
      ctx.bezierCurveTo(-KNIFE_WIDTH/2, -KNIFE_HEIGHT/4, -KNIFE_WIDTH/2 + 5, 0, -KNIFE_WIDTH/2.5, 5);
      ctx.lineTo(KNIFE_WIDTH/2.5, 5);
      ctx.bezierCurveTo(KNIFE_WIDTH/2 - 5, 0, KNIFE_WIDTH/2, -KNIFE_HEIGHT/4, 0, -KNIFE_HEIGHT / 2);
      ctx.fill();

      // Blade inner shine
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.moveTo(0, -KNIFE_HEIGHT / 2);
      ctx.lineTo(0, 5);
      ctx.lineTo(KNIFE_WIDTH / 4, 5);
      ctx.fill();

      // Crossguard (curvy piece)
      ctx.fillStyle = theme.knifeHandle;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(-KNIFE_WIDTH, 0);
      ctx.quadraticCurveTo(0, 15, KNIFE_WIDTH, 0);
      ctx.lineTo(KNIFE_WIDTH, 8);
      ctx.quadraticCurveTo(0, 20, -KNIFE_WIDTH, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Handle
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-KNIFE_WIDTH / 4 + 1, 8, KNIFE_WIDTH / 2 - 2, 40);
      
      // Handle wraps
      ctx.strokeStyle = theme.knifeSecondary;
      ctx.lineWidth = 2;
      for(let i=12; i<45; i+=6) {
         ctx.beginPath();
         ctx.moveTo(-KNIFE_WIDTH/4 + 1, i);
         ctx.lineTo(KNIFE_WIDTH/4 - 1, i+4);
         ctx.stroke();
      }

      // Pommel (gem at bottom)
      ctx.fillStyle = theme.knifePrimary;
      ctx.beginPath();
      ctx.arc(0, 48, 5, 0, Math.PI*2);
      ctx.fill();
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, knivesLeft, level, isMuted, coins]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem("cx_knife_mute", String(next));
  };

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] w-full overflow-hidden select-none touch-none bg-[#0f172a] relative">
      
      {/* Background full screen */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: theme.bgStyle }} />

      {/* Game Container Wrapper */}
      <div className="w-full max-w-[500px] h-full sm:h-[95%] sm:max-h-[900px] relative sm:rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center shadow-2xl sm:border-[8px] border-[#0f172a]/50">
         
         {/* HUD Layer */}
         <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between w-full">
         
         {/* Top Bar */}
         <div className="flex items-start justify-between p-6 w-full">
            {/* Left: Stage & Hearts */}
            <div className="flex flex-col items-start gap-2">
               <div 
                 className="text-3xl font-black text-white italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] cursor-pointer hover:scale-105 transition-transform pointer-events-auto" 
                 style={{ fontFamily: "Impact, sans-serif" }}
                 onClick={(e) => { e.stopPropagation(); setShowLevels(true); }}
               >
                  STAGE: <span className="text-yellow-400">{levelIdx + 1}</span>
               </div>
               <div className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                     <Heart 
                        key={i} 
                        className={`w-6 h-6 ${i < lives ? "fill-red-500 text-red-500" : "fill-slate-800 text-slate-800"} drop-shadow-md`} 
                     />
                  ))}
               </div>
            </div>

            {/* Right: Score & Coins */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
               <div className="bg-slate-900/80 rounded-full pl-4 pr-1 py-1 flex items-center gap-3 border border-slate-700 shadow-xl">
                  <span className="text-xl font-bold text-white">{score}</span>
                  <div className="bg-yellow-400 rounded-full p-1.5 border-2 border-yellow-600 shadow-inner">
                     <Coins className="w-5 h-5 text-yellow-700" />
                  </div>
               </div>
               
               <div className="flex gap-2 mt-2">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                     {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  <Link to="/games">
                     <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full bg-slate-900/50">
                        <ArrowLeft className="w-5 h-5" />
                     </Button>
                  </Link>
               </div>
            </div>
         </div>

         {/* Bottom Left: Knives Remaining Tracker */}
         <div className="absolute left-6 bottom-16 flex flex-col-reverse gap-1.5 z-10">
            {Array.from({ length: level.knivesToThrow }).map((_, i) => {
               // Render small silhouette representations of knives
               const isThrown = i >= knivesLeft;
               return (
                  <div key={i} className="flex justify-center items-center">
                     <svg 
                        viewBox="0 0 24 64" 
                        className={`w-3 h-8 transition-all duration-300 ${isThrown ? 'opacity-30 scale-90' : 'opacity-100 drop-shadow-[0_0_2px_rgba(6,182,212,0.8)]'}`}
                     >
                        {/* Blade */}
                        <path d="M12 0 C 17 20, 18 30, 16 36 L 8 36 C 6 30, 7 20, 12 0 Z" fill={isThrown ? "#334155" : theme.knifeSecondary} />
                        {/* Crossguard */}
                        <path d="M 4 34 Q 12 42 20 34 L 20 38 Q 12 46 4 38 Z" fill={isThrown ? "#1e293b" : theme.knifeHandle} />
                        {/* Handle */}
                        <rect x="9" y="38" width="6" height="20" fill="#0f172a" />
                        {/* Pommel */}
                        <circle cx="12" cy="60" r="3" fill={isThrown ? "#1e293b" : theme.knifePrimary} />
                     </svg>
                  </div>
               );
            })}
         </div>

         </div> {/* End of HUD Layer */}

       {/* Game Canvas */}
       <div 
         className="absolute inset-0 w-full h-full pointer-events-auto z-0"
         onPointerDown={handleShoot}
       >
        <canvas
          ref={canvasRef}
          width={500}
          height={900}
          className="w-full h-full object-cover touch-none"
        />
       </div>

        {gameState === "won" && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 pointer-events-auto">
            <div className="bg-slate-900 p-8 rounded-3xl border-2 border-green-500/50 text-center max-w-sm w-[90%] shadow-[0_0_50px_rgba(34,197,94,0.3)]">
              <h2 className="text-4xl font-black text-green-400 mb-2 italic" style={{ fontFamily: "Impact, sans-serif" }}>STAGE CLEARED</h2>
              <div className="flex justify-center items-center gap-4 mb-6">
                 <div className="text-slate-300 text-xl font-bold">SCORE: {score}</div>
                 <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                 <div className="text-yellow-400 text-xl font-bold flex items-center gap-1">
                    <Coins className="w-5 h-5"/> {coins}
                 </div>
              </div>
              
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  nextLevel();
                }}
                className="w-full h-16 text-2xl font-bold rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all"
              >
                NEXT STAGE
              </Button>
            </div>
          </div>
        )}

        {gameState === "lost" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 pointer-events-auto">
            <div className="bg-slate-900 p-8 rounded-3xl border-2 border-red-500/50 text-center max-w-sm w-[90%] shadow-[0_0_50px_rgba(239,68,68,0.3)]">
              <h2 className="text-5xl font-black text-red-500 mb-4 italic" style={{ fontFamily: "Impact, sans-serif" }}>GAME OVER</h2>
              
              <div className="flex justify-center items-center gap-4 mb-8">
                 <div className="text-slate-300 text-xl font-bold">SCORE: {score}</div>
              </div>
              
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  restartLevel();
                }}
                className="w-full h-16 text-2xl font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
              >
                <RotateCcw className="w-8 h-8" />
                {lives <= 1 ? "RESTART GAME" : "TRY AGAIN"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
      <HintRewardAdModal
        isOpen={showAdModal}
        mode="extra-lives"
        onClose={() => {
           setShowAdModal(false);
           setGameState("lost");
        }}
        onRewardGranted={() => {
           setShowAdModal(false);
           setHasUsedRevive(true);
           setLives(1);
           setGameState("playing");
        }}
        onGameOverConfirm={() => {
           setShowAdModal(false);
           setGameState("lost");
        }}
      />

      {/* Level Selection Modal */}
      <AnimatePresence>
        {showLevels && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowLevels(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="relative w-full max-w-sm max-h-[80vh] flex flex-col bg-white rounded-3xl p-5 shadow-2xl border-4 border-black m-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl font-black text-black uppercase">
                  Select Level
                </h2>
                <span className="text-xs font-black bg-[#fef08a] text-black border-2 border-black px-2.5 py-1 rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  {KNIFE_LEVELS.length} Levels
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 pb-2 custom-scrollbar">
                <div className="flex flex-wrap gap-2.5 justify-center">
                  {Array.from({ length: KNIFE_LEVELS.length }).map((_, i) => {
                    const unlocked = i <= highestUnlocked || i >= 100;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (unlocked) {
                            setLevelIdx(i);
                            setShowLevels(false);
                          } else {
                            toast.error(`Level ${i + 1} is locked! Clear Level ${highestUnlocked + 1} first.`);
                          }
                        }}
                        className={`h-14 w-14 shrink-0 border-2 border-black font-display font-black text-xs transition-all outline-none flex flex-col items-center justify-center rounded-xl ${
                          i === levelIdx
                            ? "bg-[#bfdbfe] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-110 z-10"
                            : unlocked
                              ? "bg-white text-black hover:bg-[#fbcfe8] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 cursor-pointer"
                              : "bg-gray-100 text-gray-500 opacity-70 cursor-pointer"
                        }`}
                      >
                        <span>Lvl {i + 1}</span>
                        <span className="text-[10px]">{unlocked ? "✓" : "🔒"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
