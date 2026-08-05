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
  isKnife?: boolean;
  knifeType?: string;
  isLogo?: boolean;
}

interface LogCoin {
  angle: number;
  collected: boolean;
}

interface LogFruit {
  angle: number;
  sliced: boolean;
  type: string;
}

export interface KnifeItem {
  id: string;
  name: string;
  price: number;
  type: "classic" | "cleaver" | "scimitar" | "crystal" | "pencil" | "pen" | "fork" | "screwdriver" | "kunai";
}

export const drawKnifeStyle = (ctx: CanvasRenderingContext2D, theme: ThemeConfig, type: string) => {
  ctx.fillStyle = theme.knifePrimary || "#ffffff";
  ctx.strokeStyle = "#2d2d2d";
  ctx.lineWidth = 3;

  if (type === "classic") {
    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2);
    ctx.lineTo(KNIFE_WIDTH / 2 - 1, 5);
    ctx.lineTo(-KNIFE_WIDTH / 2 + 1, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2 + 5);
    ctx.lineTo(0, 5);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH, 5, KNIFE_WIDTH * 2, 6);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2, 11, KNIFE_WIDTH, 30);
    ctx.fillStyle = theme.knifeHandle || "#2d2d2d";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 44, 4, 0, Math.PI * 2);
    ctx.fillStyle = theme.knifeSecondary || "#ffffff";
    ctx.fill();
    ctx.stroke();
  } else if (type === "cleaver") {
    ctx.beginPath();
    ctx.moveTo(-KNIFE_WIDTH, -KNIFE_HEIGHT / 2);
    ctx.lineTo(KNIFE_WIDTH / 2, -KNIFE_HEIGHT / 2 + 10);
    ctx.lineTo(KNIFE_WIDTH / 2, 5);
    ctx.lineTo(-KNIFE_WIDTH, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-KNIFE_WIDTH / 2, -KNIFE_HEIGHT / 2 + 10, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#2d2d2d";
    ctx.fill();

    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2, 5, KNIFE_WIDTH, 30);
    ctx.fillStyle = theme.knifeHandle || "#2d2d2d";
    ctx.fill();
    ctx.stroke();
  } else if (type === "scimitar") {
    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2);
    ctx.quadraticCurveTo(KNIFE_WIDTH, -10, 0, 5);
    ctx.lineTo(-KNIFE_WIDTH / 2, 5);
    ctx.quadraticCurveTo(-KNIFE_WIDTH / 4, -10, 0, -KNIFE_HEIGHT / 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 5, KNIFE_WIDTH, 0, Math.PI);
    ctx.fillStyle = theme.knifeSecondary || "#ffffff";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2 + 2, 5, KNIFE_WIDTH - 4, 25);
    ctx.fillStyle = theme.knifeHandle || "#2d2d2d";
    ctx.fill();
    ctx.stroke();
  } else if (type === "crystal") {
    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2);
    ctx.lineTo(KNIFE_WIDTH / 2, -15);
    ctx.lineTo(KNIFE_WIDTH / 2 - 3, -5);
    ctx.lineTo(KNIFE_WIDTH / 2 + 2, 5);
    ctx.lineTo(-KNIFE_WIDTH / 2 - 2, 5);
    ctx.lineTo(-KNIFE_WIDTH / 2 + 3, -5);
    ctx.lineTo(-KNIFE_WIDTH / 2, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-KNIFE_WIDTH, 5);
    ctx.lineTo(KNIFE_WIDTH, 5);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fillStyle = theme.knifeSecondary || "#ffffff";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 4, 12, KNIFE_WIDTH / 2, 25);
    ctx.fillStyle = theme.knifeHandle || "#2d2d2d";
    ctx.fill();
    ctx.stroke();
  } else if (type === "pencil") {
    // 2B Pencil
    // Wooden tip
    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2); // Graphite point
    ctx.lineTo(KNIFE_WIDTH / 2 - 1, -KNIFE_HEIGHT / 2 + 12);
    ctx.lineTo(-KNIFE_WIDTH / 2 + 1, -KNIFE_HEIGHT / 2 + 12);
    ctx.closePath();
    ctx.fillStyle = "#fde047"; // Wood color base? No, wood color
    ctx.fill();
    ctx.stroke();

    // Wood inner fill
    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2 + 4);
    ctx.lineTo(KNIFE_WIDTH / 2 - 1, -KNIFE_HEIGHT / 2 + 12);
    ctx.lineTo(-KNIFE_WIDTH / 2 + 1, -KNIFE_HEIGHT / 2 + 12);
    ctx.closePath();
    ctx.fillStyle = "#fcd34d"; // wood
    ctx.fill();

    // Graphite tip
    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2);
    ctx.lineTo(3, -KNIFE_HEIGHT / 2 + 4);
    ctx.lineTo(-3, -KNIFE_HEIGHT / 2 + 4);
    ctx.closePath();
    ctx.fillStyle = "#2d2d2d";
    ctx.fill();

    // Yellow Body
    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2 + 1, -KNIFE_HEIGHT / 2 + 12, KNIFE_WIDTH - 2, 35);
    ctx.fillStyle = "#facc15"; // Pencil yellow
    ctx.fill();
    ctx.stroke();

    // Metal band
    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2 + 1, -KNIFE_HEIGHT / 2 + 47, KNIFE_WIDTH - 2, 6);
    ctx.fillStyle = "#94a3b8"; // Silver
    ctx.fill();
    ctx.stroke();

    // Pink eraser
    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2 + 1, -KNIFE_HEIGHT / 2 + 53, KNIFE_WIDTH - 2, 8);
    ctx.fillStyle = "#f472b6"; // Pink
    ctx.fill();
    ctx.stroke();
  } else if (type === "pen") {
    // Ink Pen
    // Nib
    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2);
    ctx.lineTo(KNIFE_WIDTH / 2 - 2, -KNIFE_HEIGHT / 2 + 10);
    ctx.lineTo(-KNIFE_WIDTH / 2 + 2, -KNIFE_HEIGHT / 2 + 10);
    ctx.closePath();
    ctx.fillStyle = "#94a3b8"; // Silver nib
    ctx.fill();
    ctx.stroke();

    // Nib slit
    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2 + 2);
    ctx.lineTo(0, -KNIFE_HEIGHT / 2 + 8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.lineWidth = 3;

    // Body
    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2, -KNIFE_HEIGHT / 2 + 10, KNIFE_WIDTH, 45);
    ctx.fillStyle = "#1e3a8a"; // Dark blue pen body
    ctx.fill();
    ctx.stroke();

    // Pocket clip
    ctx.beginPath();
    ctx.moveTo(KNIFE_WIDTH / 2, -KNIFE_HEIGHT / 2 + 20);
    ctx.lineTo(KNIFE_WIDTH / 2 + 3, -KNIFE_HEIGHT / 2 + 22);
    ctx.lineTo(KNIFE_WIDTH / 2 + 3, -KNIFE_HEIGHT / 2 + 35);
    ctx.strokeStyle = "#94a3b8";
    ctx.stroke();
    ctx.strokeStyle = "#2d2d2d";
  } else if (type === "fork") {
    // Steel Fork
    ctx.fillStyle = "#cbd5e1"; // silver

    // Handle
    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2 + 2, -KNIFE_HEIGHT / 2 + 25, KNIFE_WIDTH - 4, 30);
    ctx.fill();
    ctx.stroke();

    // Base of prongs
    ctx.beginPath();
    ctx.moveTo(-KNIFE_WIDTH / 2 - 2, -KNIFE_HEIGHT / 2 + 10);
    ctx.lineTo(KNIFE_WIDTH / 2 + 2, -KNIFE_HEIGHT / 2 + 10);
    ctx.lineTo(KNIFE_WIDTH / 2 - 2, -KNIFE_HEIGHT / 2 + 25);
    ctx.lineTo(-KNIFE_WIDTH / 2 + 2, -KNIFE_HEIGHT / 2 + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4 Prongs
    for (let i = 0; i < 4; i++) {
      const px = -KNIFE_WIDTH / 2 - 2 + (i * ((KNIFE_WIDTH + 4) / 3));
      ctx.beginPath();
      ctx.moveTo(px, -KNIFE_HEIGHT / 2 + 10);
      ctx.lineTo(px, -KNIFE_HEIGHT / 2 - 5);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.lineWidth = 3; // reset
  } else if (type === "screwdriver") {
    // Screwdriver
    // Metal rod
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.rect(-2, -KNIFE_HEIGHT / 2, 4, 30);
    ctx.fill();
    ctx.stroke();

    // Handle
    ctx.fillStyle = "#eab308"; // yellow handle
    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2 + 1, -KNIFE_HEIGHT / 2 + 30, KNIFE_WIDTH - 2, 25);
    ctx.fill();
    ctx.stroke();

    // Handle grips
    ctx.fillStyle = "#2d2d2d";
    ctx.beginPath();
    ctx.rect(-KNIFE_WIDTH / 2 + 1, -KNIFE_HEIGHT / 2 + 35, KNIFE_WIDTH - 2, 4);
    ctx.rect(-KNIFE_WIDTH / 2 + 1, -KNIFE_HEIGHT / 2 + 45, KNIFE_WIDTH - 2, 4);
    ctx.fill();
  } else if (type === "kunai") {
    // Ninja Kunai
    // Ring
    ctx.beginPath();
    ctx.arc(0, KNIFE_HEIGHT / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = theme.knifePrimary || "#ffffff";
    ctx.fill();
    ctx.stroke();

    // Handle wrap
    ctx.beginPath();
    ctx.rect(-3, -KNIFE_HEIGHT / 2 + 30, 6, 25);
    ctx.fillStyle = "#ef4444"; // red wrap
    ctx.fill();
    ctx.stroke();

    // Blade
    ctx.beginPath();
    ctx.moveTo(0, -KNIFE_HEIGHT / 2 - 10);
    ctx.lineTo(KNIFE_WIDTH / 2 + 2, -KNIFE_HEIGHT / 2 + 15);
    ctx.lineTo(0, -KNIFE_HEIGHT / 2 + 30);
    ctx.lineTo(-KNIFE_WIDTH / 2 - 2, -KNIFE_HEIGHT / 2 + 15);
    ctx.closePath();
    ctx.fillStyle = "#94a3b8"; // dark silver
    ctx.fill();
    ctx.stroke();
  }
};

const KnifePreview = ({ type, theme }: { type: string, theme: ThemeConfig }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 10); // Center knife vertically
    drawKnifeStyle(ctx, theme, type);
    ctx.restore();
  }, [type, theme]);

  return <canvas ref={canvasRef} width={60} height={100} className="pointer-events-none w-16 h-24 drop-shadow-md" />;
};

let globalAudioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!globalAudioCtx) {
    globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
};

// Simple Web Audio API Synth
const playSynth = (type: "wood" | "metal" | "throw" | "win" | "coin" | "slice", isMuted: boolean) => {
  if (isMuted) return;
  try {
    const audioCtx = getAudioCtx();
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
    } catch (e) { }
  }
};

export default function KnifeThrowerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = "/logo.jpeg";
    img.onload = () => {
      logoImgRef.current = img;
    };
  }, []);

  const [levelIdx, setLevelIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const [gameState, setGameState] = useState<"playing" | "won" | "lost" | "ad_offer">("playing");
  const [score, setScore] = useState(0);
  const [knivesLeft, setKnivesLeft] = useState(0);
  const [lives, setLives] = useState(3);
  const [coins, setCoins] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [highestUnlocked, setHighestUnlocked] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("cx_knife_best_score") || "0", 10);
    }
    return 0;
  });

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("cx_knife_best_score", score.toString());
    }
  }, [score, bestScore]);
  const [showLevels, setShowLevels] = useState(false);
  const [hasUsedRevive, setHasUsedRevive] = useState(false);

  const [ownedKnives, setOwnedKnives] = useState<string[]>(() => {
    const saved = localStorage.getItem("cx_knife_owned");
    return saved ? JSON.parse(saved) : ["k_classic"];
  });
  const [equippedKnife, setEquippedKnife] = useState<string>(() => {
    return localStorage.getItem("cx_knife_equipped") || "k_classic";
  });

  const theme = getThemeForLevel(levelIdx + 1);

  const stateRef = useRef({
    logAngle: 0,
    stuckKnives: [] as { angle: number, type: string }[],
    logCoins: [] as LogCoin[],
    logFruits: [] as LogFruit[],
    flyingKnife: null as { y: number, type: string } | null,
    particles: [] as Particle[],
    targetShattered: false,
    targetPieces: [] as any[],
    targetShatterTimer: 0,
    levelFrames: 0,
    speedModifier: 1,
  });

  const level = KNIFE_LEVELS[levelIdx] || KNIFE_LEVELS[KNIFE_LEVELS.length - 1];

  const initLevel = useCallback((lvl: KnifeLevel) => {
    // Generate some random coins around the edge of the log (up to 4)
    const newLogCoins: LogCoin[] = [];
    const newLogFruits: LogFruit[] = [];
    let spawnedItems = 0;
    let attempts = 0;

    // Spawn 1-2 coins and 1-2 apples
    const numCoins = Math.floor(Math.random() * 2) + 1;
    const numApples = Math.floor(Math.random() * 2) + 1;
    const totalItems = numCoins + numApples;

    // Find safe spots for items avoiding preStuckKnives
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
        const allItems = [...newLogCoins.map(c => c.angle), ...newLogFruits.map(a => a.angle)];
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
          const fruitTypes = ["apple", "orange", "lemon", "watermelon"];
          const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
          newLogFruits.push({ angle: candidateAngle, sliced: false, type });
        }
        spawnedItems++;
      }
      attempts++;
    }

    stateRef.current = {
      logAngle: 0,
      stuckKnives: lvl.preStuckKnives.map(angle => ({ angle, type: equippedKnife.replace("k_", "") })),
      logCoins: newLogCoins,
      logFruits: newLogFruits,
      flyingKnife: null,
      particles: [],
      targetShattered: false,
      targetPieces: [] as any[],
      targetShatterTimer: 0,
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
    if (knivesLeft <= 0) return; // Check if we have knives left

    playSynth("throw", isMuted);

    stateRef.current.flyingKnife = { y: KNIFE_START_Y, type: equippedKnife.replace("k_", "") };
  };

  const nextLevel = () => {
    const next = Math.min(levelIdx + 1, KNIFE_LEVELS.length - 1);
    localStorage.setItem("cx_knife_level", next.toString());
    setLevelIdx(next);
  };

  const restartLevel = () => {
    setLives(3);
    setScore(0); // Reset score on game over, but keep the level
    // Do not reset level to 0
    initLevel(KNIFE_LEVELS[levelIdx]);
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

  const createAppleHalves = (x: number, y: number, type: string) => {
    let color = "#ff4d4d"; // apple
    if (type === "orange") color = "#f97316";
    else if (type === "lemon") color = "#facc15";
    else if (type === "watermelon") color = "#ef4444";

    stateRef.current.particles.push(
      { x, y, vx: -5, vy: -5, life: 0, maxLife: 60, color, isAppleHalf: "left", rotation: 0, rotSpeed: -0.1 },
      { x, y, vx: 5, vy: -5, life: 0, maxLife: 60, color, isAppleHalf: "right", rotation: 0, rotSpeed: 0.1 },
      // Add some juice particles
      ...Array.from({ length: 10 }).map(() => ({
        x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 0, maxLife: 30, color: "#fef08a"
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

        if (state.targetShattered) {
          state.targetShatterTimer--;
          if (state.targetShatterTimer <= 0) {
            playSynth("win", isMuted);
            triggerVibration([50, 50, 50]);
            setGameState("won");
            recordGameSession("knife-thrower", 1, levelIdx + 1);

            const nextLvl = levelIdx + 1;
            setHighestUnlocked(prev => {
              const newMax = Math.max(prev, nextLvl);
              localStorage.setItem("cx_knife_max_level", newMax.toString());
              return newMax;
            });

            // Give coins for winning
            setCoins((c) => {
              const nc = c + 10 + Math.floor(score / 50);
              localStorage.setItem("cx_knife_coins", nc.toString());
              return nc;
            });
          }

          for (const p of state.targetPieces) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.8; // gravity
            p.rotation += p.rotSpeed;
          }
        } else {
          state.logAngle += currentSpeed;
        }

        if (state.flyingKnife && !state.targetShattered) {
          state.flyingKnife.y -= KNIFE_SPEED;

          // Check collision with log
          if (state.flyingKnife.y <= LOG_Y + LOG_RADIUS - 10) {
            const hitAngle = -state.logAngle;
            const normalizedHit = hitAngle % (Math.PI * 2);
            const finalHit = normalizedHit < 0 ? normalizedHit + Math.PI * 2 : normalizedHit;

            // Check collision with stuck knives
            let hitMetal = false;
            for (const stuck of state.stuckKnives) {
              const diff = Math.abs(stuck.angle - finalHit);
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

            // Check collision with fruits
            for (const fruit of state.logFruits) {
              if (!fruit.sliced) {
                const diff = Math.abs(fruit.angle - finalHit);
                const wrapDiff = Math.min(diff, Math.PI * 2 - diff);
                if (wrapDiff < 0.2) {
                  fruit.sliced = true;
                  setScore(prev => prev + 20); // extra points for fruit
                  playSynth("slice", isMuted);
                  createAppleHalves(LOG_X, LOG_Y + LOG_RADIUS + 15, fruit.type);
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
              // Stick knife to log
              state.stuckKnives.push({ angle: finalHit, type: state.flyingKnife.type });
              playSynth("wood", isMuted);
              triggerVibration([30]);
              createParticles(LOG_X, LOG_Y + LOG_RADIUS, "#d97706", 15);
              state.flyingKnife = null;

              setKnivesLeft((prev) => {
                const next = prev - 1;
                setScore((s) => s + 10);
                if (next <= 0 && !stateRef.current.targetShattered) {
                  // Shatter Level
                  playSynth("metal", isMuted);
                  triggerVibration([50, 50, 50]);
                  stateRef.current.targetShattered = true;
                  stateRef.current.targetShatterTimer = 60; // wait 1 second before showing won modal
                  createParticles(LOG_X, LOG_Y, "#fde047", 100); // big explosion

                  // Shatter the log into pieces
                  for (let i = 0; i < 4; i++) {
                    stateRef.current.targetPieces.push({
                      x: LOG_X, y: LOG_Y,
                      vx: (Math.random() - 0.5) * 15,
                      vy: -5 - Math.random() * 10,
                      rotation: 0,
                      rotSpeed: (Math.random() - 0.5) * 0.4,
                      quadrant: i
                    });
                  }

                  // Center logo piece
                  stateRef.current.targetPieces.push({
                    x: LOG_X, y: LOG_Y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: -8 - Math.random() * 5,
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 0.6,
                    isLogo: true
                  });

                  // Throw all stuck knives outwards
                  const newParticles = [];
                  for (const stuck of stateRef.current.stuckKnives) {
                    newParticles.push({
                      x: LOG_X,
                      y: LOG_Y,
                      vx: (Math.random() - 0.5) * 20,
                      vy: (Math.random() - 0.5) * 20 - 5,
                      life: 200,
                      maxLife: 200,
                      color: "#94a3b8",
                      rotation: stuck.angle + stateRef.current.logAngle,
                      rotSpeed: (Math.random() - 0.5) * 0.4,
                      isKnife: true,
                      knifeType: stuck.type,
                    });
                  }
                  stateRef.current.targetPieces.push(...newParticles);
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
          if (p.rotation !== undefined && p.rotSpeed) p.rotation += p.rotSpeed;
        }

        p.life++;
        if (p.life >= p.maxLife) {
          state.particles.splice(i, 1);
        }
      }

      // Draw
      ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Helper for sketchy circles
      const drawSketchyCircle = (x: number, y: number, r: number, strokeColor: string, fillColor?: string, lineWidth: number = 3) => {
        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        // inner messy stroke
        ctx.beginPath();
        ctx.arc(x, y, r + (Math.random() - 0.5) * 4, 0, Math.PI * 2);
        ctx.lineWidth = lineWidth * 0.5;
        ctx.stroke();
      };

      // Draw Target Base
      if (!state.targetShattered) {
        ctx.save();
        ctx.translate(LOG_X, LOG_Y);
        ctx.rotate(state.logAngle);

        // The log (a messy sketched circle)
        if (theme.targetType === "wood") {
          drawSketchyCircle(0, 0, LOG_RADIUS, "#2d2d2d", "#ffffff", 4);
          for (let r = 20; r < LOG_RADIUS - 15; r += 20) {
            ctx.beginPath();
            ctx.arc(0, 0, r + (Math.random() - 0.5) * 2, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(45,45,45,0.3)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else if (theme.targetType === "orange") {
          drawSketchyCircle(0, 0, LOG_RADIUS, "#2d2d2d", "#fff7ed", 4);
          drawSketchyCircle(0, 0, LOG_RADIUS - 5, "#ea580c", "#ffedd5", 2);
          ctx.strokeStyle = "#ea580c";
          ctx.lineWidth = 3;
          for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const a = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.1;
            ctx.lineTo(Math.cos(a) * (LOG_RADIUS - 5), Math.sin(a) * (LOG_RADIUS - 5));
            ctx.stroke();
          }
          drawSketchyCircle(0, 0, 10, "#ea580c", "#ffffff", 2);
        } else if (theme.targetType === "peppermint") {
          drawSketchyCircle(0, 0, LOG_RADIUS, "#2d2d2d", "#fdf2f8", 4);
          ctx.fillStyle = "#ec4899";
          ctx.strokeStyle = "#2d2d2d";
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const a1 = (Math.PI * 2 * i) / 8;
            const a2 = (Math.PI * 2 * (i + 0.5)) / 8;
            ctx.arc(0, 0, LOG_RADIUS, a1, a2);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.stroke();
          }
        } else if (theme.targetType === "kiwi") {
          drawSketchyCircle(0, 0, LOG_RADIUS, "#2d2d2d", "#84cc16", 4);
          drawSketchyCircle(0, 0, 15, "#2d2d2d", "#ecfccb", 2);
          ctx.fillStyle = "#2d2d2d";
          for (let i = 0; i < 16; i++) {
            const a = (Math.PI * 2 * i) / 16;
            const dist = 25 + Math.random() * 10;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, 2 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw cracks based on stuck knives (cracks originate from the edge where the knife hits)
        if (state.stuckKnives.length > 0) {
          ctx.strokeStyle = "rgba(30,20,10,0.85)"; // dark wood crack color
          for (let i = 0; i < state.stuckKnives.length; i++) {
            // Seed a consistent random-like value based on the angle so cracks don't flicker
            const seed = Math.abs(state.stuckKnives[i].angle * 1000) % 100;

            ctx.save();
            ctx.rotate(state.stuckKnives[i].angle);

            // Generate jagged path towards the center
            let cy = LOG_RADIUS; // Start exactly at the edge
            let cx = 0;
            const steps = 6 + (seed % 4);
            const path = [];
            for (let s = 1; s <= steps; s++) {
              cy -= (LOG_RADIUS / steps) * (0.8 + (seed % 3) * 0.1);
              cx += (seed % 10 - 5) * 1.5; // zig-zag
              path.push({ x: cx, y: cy });
            }

            // Draw the main crack with tapering thickness
            let currentX = 0;
            let currentY = LOG_RADIUS;
            for (let s = 0; s < path.length; s++) {
              ctx.beginPath();
              ctx.moveTo(currentX, currentY);
              ctx.lineTo(path[s].x, path[s].y);
              ctx.lineWidth = Math.max(0.5, 3 - (s * 0.5));
              ctx.stroke();
              currentX = path[s].x;
              currentY = path[s].y;
            }

            // Draw some tiny splinter lines at the impact point
            ctx.beginPath();
            ctx.moveTo(0, LOG_RADIUS);
            ctx.lineTo(-6 - (seed % 5), LOG_RADIUS - 12);
            ctx.moveTo(0, LOG_RADIUS);
            ctx.lineTo(6 + (seed % 4), LOG_RADIUS - 10);
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
          }
        }

        // Draw center logo (CampusXpose / CX)
        ctx.save();
        if (logoImgRef.current) {
          ctx.beginPath();
          // A 50x50 circle logo in the middle
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logoImgRef.current, -25, -25, 50, 50);
          // Add a sketchy border around it
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#2d2d2d";
          ctx.stroke();
        } else {
          // Fallback if logo fails to load
          ctx.fillStyle = "#2d2d2d";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "900 40px 'Patrick Hand', 'Kalam', 'Inter', sans-serif";
          ctx.globalAlpha = 0.8;
          ctx.fillText("CX", 0, -5);
          ctx.font = "bold 12px 'Patrick Hand', 'Kalam', 'Inter', sans-serif";
          ctx.fillText("CAMPUSXPOSE", 0, 22);
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();

        // Draw Coins on log
        for (const coin of state.logCoins) {
          if (!coin.collected) {
            ctx.save();
            ctx.rotate(coin.angle);
            ctx.translate(0, LOG_RADIUS + 15);
            drawSketchyCircle(0, 0, 16, "#2d2d2d", "#fff9c4", 2); // postit yellow
            ctx.fillStyle = "#2d2d2d";
            ctx.font = "bold 20px 'Patrick Hand', 'Kalam', Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("$", 0, 0);
            ctx.restore();
          }
        }

        // Draw fruits
        for (const fruit of state.logFruits) {
          if (!fruit.sliced) {
            ctx.save();
            ctx.rotate(fruit.angle);
            ctx.translate(0, LOG_RADIUS + 15);

            if (fruit.type === "orange") {
              drawSketchyCircle(0, 0, 14, "#2d2d2d", "#f97316", 2);
              // stem & leaf
              ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(4, -20); ctx.strokeStyle = "#2d2d2d"; ctx.lineWidth = 2; ctx.stroke();
              ctx.beginPath(); ctx.ellipse(8, -14, 6, 3, -Math.PI / 4, 0, Math.PI * 2); ctx.fillStyle = "#3a8a4f"; ctx.fill(); ctx.stroke();
            } else if (fruit.type === "lemon") {
              // Draw an ellipse
              ctx.beginPath();
              ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
              ctx.fillStyle = "#facc15";
              ctx.fill();
              ctx.strokeStyle = "#2d2d2d";
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if (fruit.type === "watermelon") {
              // Draw a melon
              drawSketchyCircle(0, 0, 15, "#2d2d2d", "#15803d", 2);
              // Stripes
              ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(-5, 15); ctx.strokeStyle = "#166534"; ctx.lineWidth = 3; ctx.stroke();
              ctx.beginPath(); ctx.moveTo(5, -15); ctx.lineTo(5, 15); ctx.strokeStyle = "#166534"; ctx.lineWidth = 3; ctx.stroke();
            } else {
              // Apple
              drawSketchyCircle(0, 0, 14, "#2d2d2d", "#ff4d4d", 2);
              // stem & leaf
              ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(4, -20); ctx.strokeStyle = "#2d2d2d"; ctx.lineWidth = 2; ctx.stroke();
              ctx.beginPath(); ctx.ellipse(8, -14, 6, 3, -Math.PI / 4, 0, Math.PI * 2); ctx.fillStyle = "#3a8a4f"; ctx.fill(); ctx.stroke();
            }

            ctx.restore();
          }
        }

        // Draw stuck knives
        for (const stuck of state.stuckKnives) {
          ctx.save();
          ctx.rotate(stuck.angle);
          ctx.translate(0, LOG_RADIUS - 10);
          drawKnifeStyle(ctx, theme, stuck.type);
          ctx.restore();
        }
        ctx.restore();
      } else {
        // Draw shattered pieces
        for (const p of state.targetPieces) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          if (p.isKnife && p.knifeType) {
            ctx.translate(0, -10);
            drawKnifeStyle(ctx, theme, p.knifeType);
          } else if (p.isLogo) {
            // Add shadow so the logo pops out realistically when falling
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;

            // Draw a solid white background circle for the logo
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            // Clear shadow for the image and border to prevent double-shadows
            ctx.shadowColor = "transparent";

            if (logoImgRef.current) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(0, 0, 25, 0, Math.PI * 2);
              ctx.clip();
              ctx.drawImage(logoImgRef.current, -25, -25, 50, 50);
              ctx.restore();
            } else {
              ctx.fillStyle = "#2d2d2d";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.font = "900 40px 'Patrick Hand', 'Kalam', 'Inter', sans-serif";
              ctx.fillText("CX", 0, -5);
            }

            // Draw nice thick sketchy border
            ctx.beginPath();
            ctx.arc(0, 0, 26, 0, Math.PI * 2);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#2d2d2d";
            ctx.stroke();
          } else {
            ctx.beginPath();
            const startAngle = (p.quadrant || 0) * (Math.PI / 2);
            const endAngle = startAngle + (Math.PI / 2);
            ctx.arc(0, 0, LOG_RADIUS, startAngle, endAngle);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fillStyle = theme.targetType === "orange" ? "#fff7ed" : (theme.targetType === "peppermint" ? "#fdf2f8" : (theme.targetType === "kiwi" ? "#ecfccb" : "#ffffff"));
            ctx.fill();
            ctx.strokeStyle = "#2d2d2d";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, LOG_RADIUS - 5, startAngle, endAngle);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fillStyle = theme.targetType === "orange" ? "#ea580c" : (theme.targetType === "peppermint" ? "#ec4899" : (theme.targetType === "kiwi" ? "#84cc16" : "#2d2d2d"));
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // Draw flying knife
      if (state.flyingKnife) {
        ctx.save();
        ctx.translate(LOG_X, state.flyingKnife.y);

        // Speed trail (sketchy lines extending downwards)
        ctx.strokeStyle = "rgba(45,45,45,0.4)"; // light ink
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const xOffset = (Math.random() - 0.5) * KNIFE_WIDTH;
          const trailLength = 30 + Math.random() * 50;
          ctx.moveTo(xOffset, KNIFE_HEIGHT / 2 + 5);
          ctx.lineTo(xOffset, KNIFE_HEIGHT / 2 + 5 + trailLength);
        }
        ctx.stroke();

        // Second trail layer (white swoosh)
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const xOffset = (Math.random() - 0.5) * KNIFE_WIDTH;
          const trailLength = 20 + Math.random() * 40;
          ctx.moveTo(xOffset, KNIFE_HEIGHT / 2 + 5);
          ctx.lineTo(xOffset, KNIFE_HEIGHT / 2 + 5 + trailLength);
        }
        ctx.stroke();

        ctx.rotate(0);
        drawKnifeStyle(ctx, theme, state.flyingKnife.type);
        ctx.restore();
      }

      // Draw waiting knife at bottom
      if (gameState === "playing" && knivesLeft > 0 && !state.flyingKnife) {
        ctx.save();
        ctx.translate(LOG_X, KNIFE_START_Y);
        drawKnifeStyle(ctx, theme, equippedKnife.replace("k_", ""));
        ctx.restore();
      }

      // Particles (including apple halves)
      for (const p of state.particles) {
        ctx.globalAlpha = 1 - p.life / p.maxLife;

        if (p.isAppleHalf) {
          ctx.save();
          ctx.translate(p.x, p.y);
          if (p.rotation) ctx.rotate(p.rotation);

          ctx.fillStyle = p.color;
          ctx.strokeStyle = "#2d2d2d";
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (p.isAppleHalf === "left") {
            ctx.arc(0, 0, 14, Math.PI / 2, Math.PI * 1.5);
            ctx.lineTo(0, 14);
          } else {
            ctx.arc(0, 0, 14, -Math.PI / 2, Math.PI / 2);
            ctx.lineTo(0, -14);
          }
          ctx.fill();
          ctx.stroke();

          ctx.restore();
        } else {
          // Sketchy particle (crosshatch or simple scribble)
          ctx.strokeStyle = "#2d2d2d"; // ink

          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(p.x - 3, p.y - 3);
          ctx.lineTo(p.x + 3, p.y + 3);
          ctx.moveTo(p.x + 3, p.y - 3);
          ctx.lineTo(p.x - 3, p.y + 3);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, knivesLeft, level, isMuted, coins, equippedKnife]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem("cx_knife_mute", String(next));
  };

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] w-full overflow-hidden select-none touch-none bg-background relative">

      {/* Background full screen - Clean Sketch Paper (No notebook lines, no text) */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          backgroundColor: "#f4f1ea", // Light cream/ivory sketch paper color
          backgroundImage: `url('https://www.transparenttextures.com/patterns/handmade-paper.png')`,
          boxShadow: "inset 0 0 120px rgba(0, 0, 0, 0.08)" // Very subtle vignette
        }}
      />

      {/* Game Container Wrapper */}
      <div className="w-full max-w-[500px] h-full sm:h-[95%] sm:max-h-[900px] relative sm:rounded-wobbly overflow-hidden flex flex-col items-center justify-center shadow-ink-lg sm:border-4 border-ink z-10">

        {/* HUD Layer */}
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between w-full">

          {/* Top Bar */}
          <div className="flex items-start justify-between p-4 sm:p-6 w-full pointer-events-none">
            {/* Left: Stage & Hearts */}
            <div className="flex flex-col items-start gap-3 pointer-events-auto">
              <div
                className="text-2xl sm:text-3xl font-black text-ink font-display cursor-pointer hover:scale-105 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-[#fef08a] border-4 border-ink px-4 py-1 rounded-sm -rotate-3 relative"
                onClick={(e) => { e.stopPropagation(); setShowLevels(true); }}
              >
                {/* Pin graphic */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 border-2 border-ink shadow-sm" />
                STAGE <span className="text-red-600">{levelIdx + 1}</span>
              </div>

              <div className="flex gap-1.5 ml-1 bg-white/80 p-1.5 rounded-full border-2 border-ink shadow-ink-soft backdrop-blur-sm">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-5 h-5 sm:w-6 sm:h-6 stroke-[3px] transition-all duration-300 ${i < lives ? "fill-red-500 text-ink scale-100" : "fill-transparent text-ink/40 scale-90"}`}
                  />
                ))}
              </div>
            </div>

            {/* Right: Score, Coins & Utils */}
            <div className="flex flex-col items-end gap-3 pointer-events-auto">
              <div className="flex flex-col items-end">
                <div className="text-xs sm:text-sm font-black text-ink bg-blue-100 px-3 py-0.5 border-2 border-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-2 relative top-2 z-10 mr-2">
                  BEST: {Math.max(score, bestScore)}
                </div>
                <div className="bg-white border-4 border-ink rounded-xl pl-4 pr-1 py-1.5 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-1 relative z-0">
                  <span className="text-2xl sm:text-3xl font-black text-ink font-display leading-none mt-1">{score}</span>
                  <div className="bg-yellow-300 rounded-full p-1.5 border-2 border-ink">
                    <Coins className="w-5 h-5 text-ink" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="text-ink border-2 border-ink bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-full hover:bg-gray-100 w-10 h-10 sm:w-12 sm:h-12 hover:-translate-y-0.5 transition-all" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
                <Link to="/games">
                  <Button variant="ghost" size="icon" className="text-ink border-2 border-ink bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-full hover:bg-gray-100 w-10 h-10 sm:w-12 sm:h-12 hover:-translate-y-0.5 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Left: Knives Remaining Tracker */}
          <div className="absolute left-4 sm:left-6 bottom-8 sm:bottom-16 flex flex-col-reverse gap-1 sm:gap-2 z-10 pointer-events-none">
            {Array.from({ length: level.knivesToThrow }).map((_, i) => {
              const isThrown = i >= knivesLeft;
              return (
                <div key={i} className="flex justify-center items-center">
                  <svg
                    viewBox="0 0 24 64"
                    className={`w-3 h-8 sm:w-4 sm:h-10 transition-all duration-300 ${isThrown ? 'opacity-30 scale-90' : 'opacity-100 drop-shadow-ink-soft'}`}
                  >
                    <path
                      d="M12 2 L14 15 L14 45 L16 45 L16 60 L8 60 L8 45 L10 45 L10 15 Z"
                      fill={isThrown ? "#94a3b8" : (theme.knifePrimary || "#cbd5e1")}
                      stroke="#2d2d2d"
                      strokeWidth="2"
                    />
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
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 pointer-events-auto animate-in fade-in duration-300">
            <div className="bg-paper border-4 border-ink p-8 text-center max-w-sm w-[90%] flex flex-col items-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] -rotate-2 relative overflow-visible mt-12 animate-in zoom-in-95 duration-500 spring">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 animate-bounce drop-shadow-xl z-20">
                <img src="/logo.jpeg" className="w-24 h-24 object-contain rounded-full border-4 border-ink bg-white shadow-ink-soft" alt="CX Logo" />
              </div>

              <div className="mt-8 mb-1 font-display text-ink text-xl font-bold tracking-widest bg-yellow-200 px-3 py-1 -rotate-3 border-2 border-ink">CX GAMES</div>
              <h2 className="text-4xl font-black text-success mb-2 font-display uppercase italic drop-shadow-sm">Stage Cleared!</h2>

              <div className="bg-postit w-full p-4 rounded-sm border-2 border-ink shadow-ink-soft rotate-2 my-4 flex flex-col gap-2">
                <div className="text-ink text-xl font-black font-display flex items-center justify-between gap-4"><span>SCORE</span> <span>{score}</span></div>
                <div className="text-ink/60 text-sm font-black font-display flex items-center justify-between gap-4"><span>BEST SCORE</span> <span>{Math.max(score, bestScore)}</span></div>
                <div className="w-full h-0.5 bg-ink/20 rounded-full" />
                <div className="text-warning text-xl font-black font-display flex items-center justify-between gap-4"><span>COINS</span> <span className="flex items-center gap-1"><Coins className="w-5 h-5" />{coins}</span></div>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  nextLevel();
                }}
                className="w-full h-16 text-2xl font-bold rounded-xl bg-success hover:bg-success/90 text-white border-2 border-success-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 active:translate-y-1 active:shadow-none font-display mt-2"
              >
                NEXT STAGE
              </Button>
            </div>
          </div>
        )}

        {gameState === "lost" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 pointer-events-auto animate-in fade-in duration-300">
            <div className="bg-paper border-4 border-ink p-8 text-center max-w-sm w-[90%] flex flex-col items-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rotate-1 relative overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="absolute top-0 left-0 w-full h-3 bg-destructive border-b-4 border-ink" />
              <div className="mt-4 mb-2 opacity-50"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink"><path d="m15 9-6 6" /><path d="m9 9 6 6" /><circle cx="12" cy="12" r="10" /></svg></div>
              <h2 className="text-6xl font-black text-destructive mb-2 font-display uppercase tracking-tighter drop-shadow-sm">GAME OVER</h2>
              <div className="text-ink font-bold font-sans opacity-70 mb-4 bg-gray-200 px-3 py-1 rounded-sm border-2 border-dashed border-gray-400">STAGE {levelIdx + 1} FAILED</div>

              <div className="bg-white p-4 rounded-sm border-4 border-ink mb-6 w-full relative shadow-ink-soft flex flex-col gap-2">
                <div className="absolute -top-4 -right-4 bg-destructive text-white font-black px-3 py-1 rotate-12 text-sm border-2 border-ink shadow-ink-soft">FINAL</div>
                <div className="text-ink text-3xl font-black font-display flex items-center justify-between"><span>SCORE</span> <span>{score}</span></div>
                <div className="w-full h-0.5 bg-ink/20 rounded-full" />
                <div className="text-ink text-lg font-black font-display flex items-center justify-between opacity-60"><span>BEST SCORE</span> <span>{Math.max(score, bestScore)}</span></div>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  restartLevel();
                }}
                className="w-full h-16 text-2xl font-bold rounded-xl bg-destructive hover:bg-destructive/90 text-white border-2 border-destructive-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-3 font-display"
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
          setLives(3);
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
                        className={`h-14 w-14 shrink-0 border-2 border-black font-display font-black text-xs transition-all outline-none flex flex-col items-center justify-center rounded-xl ${i === levelIdx
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
