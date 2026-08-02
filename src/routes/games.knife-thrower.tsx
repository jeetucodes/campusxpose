import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Heart, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordGameSession } from "../lib/gameAnalytics";
import { KNIFE_LEVELS, KnifeLevel } from "../data/knife-levels";
import { toast } from "sonner";

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

const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 1200;
const LOG_X = 400;
const LOG_Y = 350;
const LOG_RADIUS = 160; // Slightly larger for better visual
const KNIFE_WIDTH = 30;
const KNIFE_HEIGHT = 120;
const KNIFE_START_Y = 950;
const KNIFE_SPEED = 60;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface LogCoin {
  angle: number;
  collected: boolean;
}

// Simple Web Audio API Synth
const playSynth = (type: "wood" | "metal" | "throw" | "win" | "coin", isMuted: boolean) => {
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
  
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [score, setScore] = useState(0);
  const [knivesLeft, setKnivesLeft] = useState(0);
  const [lives, setLives] = useState(3);
  const [coins, setCoins] = useState(0);

  const stateRef = useRef({
    logAngle: 0,
    stuckKnives: [] as number[],
    logCoins: [] as LogCoin[],
    flyingKnife: null as { y: number } | null,
    particles: [] as Particle[],
    levelFrames: 0,
    speedModifier: 1,
  });

  const level = KNIFE_LEVELS[levelIdx] || KNIFE_LEVELS[KNIFE_LEVELS.length - 1];

  const initLevel = useCallback((lvl: KnifeLevel) => {
    // Generate some random coins around the edge of the log (up to 4)
    const newLogCoins: LogCoin[] = [];
    const numCoins = Math.floor(Math.random() * 3) + 1; // 1 to 3 coins
    
    // Find safe spots for coins avoiding preStuckKnives
    let attempts = 0;
    while (newLogCoins.length < numCoins && attempts < 50) {
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
       // Check against other coins
       if (safe) {
          for (const coin of newLogCoins) {
             const diff = Math.abs(coin.angle - candidateAngle);
             const wrapDiff = Math.min(diff, Math.PI * 2 - diff);
             if (wrapDiff < 0.4) {
                safe = false;
                break;
             }
          }
       }
       
       if (safe) {
          newLogCoins.push({ angle: candidateAngle, collected: false });
       }
       attempts++;
    }

    stateRef.current = {
      logAngle: 0,
      stuckKnives: [...lvl.preStuckKnives],
      logCoins: newLogCoins,
      flyingKnife: null,
      particles: [],
      levelFrames: 0,
      speedModifier: 1,
    };
    setKnivesLeft(lvl.knivesToThrow);
    setGameState("playing");
  }, []);

  // Initialization
  useEffect(() => {
    const savedLevel = parseInt(localStorage.getItem("cx_knife_level") || "0", 10);
    setLevelIdx(Math.min(savedLevel, KNIFE_LEVELS.length - 1));
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
    if (lives <= 1) {
       // Reset game entirely if lives run out? Or just reset lives.
       setLives(3);
       setScore(0);
       setLevelIdx(0);
       localStorage.setItem("cx_knife_level", "0");
    } else {
       setLives(prev => prev - 1);
       initLevel(level);
    }
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

            if (hitMetal) {
              // Game Over
              playSynth("metal", isMuted);
              triggerVibration([100, 50, 100]);
              setGameState("lost");
              createParticles(LOG_X, LOG_Y + LOG_RADIUS, "#94a3b8", 30);
              
              state.flyingKnife.y += 50; 
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
                    recordGameSession("knife-thrower", 1, levelIdx + 1);
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

      // Draw target Log
      ctx.save();
      ctx.translate(LOG_X, LOG_Y);
      ctx.rotate(state.logAngle);

      // Log bark (outer edge)
      ctx.beginPath();
      ctx.arc(0, 0, LOG_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#b45309"; // outer brown
      ctx.fill();
      
      // Log inner rings (wood texture)
      ctx.beginPath();
      ctx.arc(0, 0, LOG_RADIUS - 15, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b"; // light wood base
      ctx.fill();

      // Draw concentric rings
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(139, 69, 19, 0.4)";
      for (let r = LOG_RADIUS - 30; r > 20; r -= 20) {
         ctx.beginPath();
         // Slightly irregular circles
         for(let a=0; a<Math.PI*2; a+=0.5) {
            const rad = r + Math.sin(a*4)*2;
            ctx.lineTo(Math.cos(a)*rad, Math.sin(a)*rad);
         }
         ctx.closePath();
         ctx.stroke();
      }

      // Draw cracks
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(139, 69, 19, 0.7)";
      for (let i = 0; i < 5; i++) {
         ctx.save();
         ctx.rotate((i * Math.PI * 2) / 5 + 0.5);
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.lineTo(10, LOG_RADIUS * 0.4);
         ctx.lineTo(-5, LOG_RADIUS * 0.7);
         ctx.lineTo(15, LOG_RADIUS - 10);
         ctx.stroke();
         ctx.restore();
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

      // Particles
      for (const p of state.particles) {
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    const drawKnife = (ctx: CanvasRenderingContext2D, isStuck: boolean) => {
      // Draw centered around (0,0) facing UP
      // A sharper fantasy blue dagger like the reference image
      
      const bladeGrad = ctx.createLinearGradient(0, -KNIFE_HEIGHT/2, 0, 0);
      bladeGrad.addColorStop(0, "#a5f3fc"); // bright cyan tip
      bladeGrad.addColorStop(0.5, "#06b6d4"); // mid cyan
      bladeGrad.addColorStop(1, "#1e3a8a"); // dark blue base

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
      ctx.fillStyle = "#1e40af";
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
      
      // Handle wraps (cyan lines)
      ctx.strokeStyle = "#0891b2";
      ctx.lineWidth = 2;
      for(let i=12; i<45; i+=6) {
         ctx.beginPath();
         ctx.moveTo(-KNIFE_WIDTH/4 + 1, i);
         ctx.lineTo(KNIFE_WIDTH/4 - 1, i+4);
         ctx.stroke();
      }

      // Pommel (gem at bottom)
      ctx.fillStyle = "#3b82f6";
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
    <div className="flex flex-col h-screen overflow-hidden select-none touch-none"
         style={{ background: "linear-gradient(to bottom, #271b4a, #1e3a8a, #0f172a)" }}
         onPointerDown={handleShoot}>
      
      {/* HUD Layer - Matches the Screenshot aesthetics */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between max-w-[500px] mx-auto w-full">
         
         {/* Top Bar */}
         <div className="flex items-start justify-between p-6 w-full">
            {/* Left: Stage & Hearts */}
            <div className="flex flex-col items-start gap-2">
               <div className="text-3xl font-black text-white italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: "Impact, sans-serif" }}>
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
         <div className="absolute left-6 bottom-20 flex flex-col-reverse gap-3 z-10">
            {Array.from({ length: level.knivesToThrow }).map((_, i) => {
               // Render small silhouette representations of knives
               const isThrown = i >= knivesLeft;
               return (
                  <div key={i} className="w-8 h-20 relative">
                     {/* Blade part */}
                     <div className={`absolute top-0 left-[35%] w-[30%] h-[60%] rounded-t-full shadow-lg transition-colors ${isThrown ? "bg-slate-800 opacity-50" : "bg-cyan-400"}`}></div>
                     {/* Crossguard */}
                     <div className={`absolute top-[55%] left-0 w-full h-[10%] rounded-full transition-colors ${isThrown ? "bg-slate-900 opacity-50" : "bg-blue-700"}`}></div>
                     {/* Handle */}
                     <div className={`absolute top-[65%] left-[40%] w-[20%] h-[35%] transition-colors ${isThrown ? "bg-slate-900 opacity-50" : "bg-slate-700"}`}></div>
                  </div>
               );
            })}
         </div>

      </div>

      {/* Game Canvas */}
      <div className="flex-1 relative w-full flex items-center justify-center pointer-events-none">
        <canvas
          ref={canvasRef}
          width={LOGICAL_WIDTH}
          height={LOGICAL_HEIGHT}
          className="w-full h-full object-cover pointer-events-auto max-w-[500px]"
        />

        {/* Overlays */}
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
    </div>
  );
}
