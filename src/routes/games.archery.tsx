import React, { useCallback, useEffect, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Trophy, Zap, Heart, Flame, X, Lightbulb, Volume2, VolumeX, Wind as WindIcon, Target, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { recordGameSession } from "../lib/gameAnalytics";
import HintRewardAdModal from "@/components/HintRewardAdModal";
import { useGameSync } from "@/hooks/useGameSync";
import { getStaticLevel, LevelData, Obstacle, GustZone, TargetMovement, RingType } from "../data/archery-levels";

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

export const Route = createFileRoute("/games/archery")({
  head: () => ({
    meta: [
      { title: "Archery Master — CampusXpose Games" },
      { name: "description", content: "Drag, aim, and shoot! Physics-based archery game on CampusXpose." },
    ],
  }),
  component: ArcheryGame,
});

// ─── Web Audio Sound Effects Synthesizer ──────────────────────────────────────
function playGameSound(type: "draw" | "release" | "hit-bullseye" | "hit-ring" | "miss" | "win", isMuted: boolean, tension?: number) {
  if (isMuted || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "draw") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const baseFreq = 200 + (tension || 0) * 200;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "release") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === "hit-bullseye") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);

      // Chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(1108, ctx.currentTime + 0.1);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.3);

    } else if (type === "hit-ring") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "miss") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // wind whoosh
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.2);
      });
    }
  } catch (e) {}
}

function triggerVibration(pattern: number | number[]) {
  if (typeof window !== "undefined" && "navigator" in window && typeof (navigator as any).vibrate === "function") {
    try {
      (navigator as any).vibrate(pattern);
    } catch (e) {}
  }
}

// ─── Constants & Types ────────────────────────────────────────────────────────
const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 600;
const GRAVITY = 800; // pixels per second squared

interface Vector { x: number; y: number }

class ArrowEntity {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  angle: number = 0;
  active: boolean = false;
  length: number = 60;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function ArcheryGame() {
  useGameSync("archery", "cx_archery_custom_levels");

  const [isMounted, setIsMounted] = useState(false);
  const [levelIdx, setLevelIdx] = useState(0);
  const [highestUnlocked, setHighestUnlocked] = useState(0);
  const [totalLevelsCount, setTotalLevelsCount] = useState(50);
  
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  
  const [arrowsLeft, setArrowsLeft] = useState(0);
  const [lives, setLives] = useState(5);
  const [hintsLeft, setHintsLeft] = useState(3);
  
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [shake, setShake] = useState(false);
  const [showLivesAd, setShowLivesAd] = useState(false);
  const [showHintAd, setShowHintAd] = useState(false);
  const [hitResult, setHitResult] = useState<{ ring: RingType, score: number, x: number, y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (to avoid dependency cycles in requestAnimationFrame)
  const stateRef = useRef({
    arrow: new ArrowEntity(),
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    bowPos: { x: 150, y: 400 },
    targetPos: { x: 800, y: 300 },
    targetBaseY: 300,
    time: 0,
    windOffset: 0, // visual moving background
    lastHit: null as any,
    previewMode: "full" as string,
    ghostEnabled: false,
    levelData: null as LevelData | null,
    won: false,
    gameOver: false,
  });

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedLevel = parseInt(localStorage.getItem("cx_archery_level") || "0", 10);
      if (!isNaN(savedLevel)) {
        setLevelIdx(savedLevel);
        setHighestUnlocked(savedLevel);
      }
    } catch (e) {}
  }, []);

  const loadLevel = useCallback((idx: number) => {
    const data = getStaticLevel(idx + 1);
    setLevelData(data);
    setArrowsLeft(data.arrowsGiven);
    setWon(false);
    setGameOver(false);
    setHitResult(null);
    stateRef.current.won = false;
    stateRef.current.gameOver = false;
    stateRef.current.levelData = data;
    
    // Reset positions
    stateRef.current.bowPos = { x: 150, y: LOGICAL_HEIGHT - 150 };
    stateRef.current.targetBaseY = (data.targetY / 100) * (LOGICAL_HEIGHT - 200) + 100;
    stateRef.current.targetPos = {
      x: 300 + (data.targetDistance / 100) * (LOGICAL_WIDTH - 400),
      y: stateRef.current.targetBaseY
    };
    
    stateRef.current.arrow.active = false;
    stateRef.current.isDragging = false;
    stateRef.current.time = 0;
    stateRef.current.previewMode = data.trajectoryPreview;
    stateRef.current.ghostEnabled = false;

    // Analytics
    if (idx > 0) recordGameSession("archery", 1, idx * 50);

  }, []);

  useEffect(() => {
    if (isMounted) loadLevel(levelIdx);
  }, [levelIdx, isMounted, loadLevel]);

  // Main Physics and Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      const state = stateRef.current;
      const lvl = state.levelData;

      if (!lvl) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      state.time += dt;

      // Update target movement
      if (lvl.targetMovement !== "static") {
        if (lvl.targetMovement === "slide-v") {
          state.targetPos.y = state.targetBaseY + Math.sin(state.time * lvl.movementSpeed) * 100;
        } else if (lvl.targetMovement === "slide-h") {
          const baseX = 300 + (lvl.targetDistance / 100) * (LOGICAL_WIDTH - 400);
          state.targetPos.x = baseX + Math.sin(state.time * lvl.movementSpeed) * 100;
        } else if (lvl.targetMovement === "rotate") {
          state.targetPos.y = state.targetBaseY + Math.sin(state.time * lvl.movementSpeed) * 80;
          const baseX = 300 + (lvl.targetDistance / 100) * (LOGICAL_WIDTH - 400);
          state.targetPos.x = baseX + Math.cos(state.time * lvl.movementSpeed) * 80;
        }
      }

      // Physics update
      const arrow = state.arrow;
      if (arrow.active && !state.won && !state.gameOver) {
        // Apply wind
        let ax = 0;
        let ay = GRAVITY;
        
        if (lvl.wind.enabled) {
          ax += lvl.wind.strength * 50; // horizontal wind acceleration
        }

        // Gust zones
        for (const gust of lvl.gustZones) {
          const gx = (gust.x / 100) * LOGICAL_WIDTH;
          const gy = (gust.y / 100) * LOGICAL_HEIGHT;
          if (arrow.x >= gx && arrow.x <= gx + gust.width && arrow.y >= gy && arrow.y <= gy + gust.height) {
            ax += gust.strength * 100;
          }
        }

        arrow.vx += ax * dt;
        arrow.vy += ay * dt;
        arrow.x += arrow.vx * dt;
        arrow.y += arrow.vy * dt;
        arrow.angle = Math.atan2(arrow.vy, arrow.vx);

        // Collisions
        // 1. Out of bounds
        if (arrow.y > LOGICAL_HEIGHT + 100 || arrow.x > LOGICAL_WIDTH + 100 || arrow.x < -100) {
          handleMiss();
        }

        // 2. Obstacles
        for (const obs of lvl.obstacles) {
          const ox = (obs.x / 100) * LOGICAL_WIDTH;
          const oy = (obs.y / 100) * LOGICAL_HEIGHT;
          
          let isActive = true;
          if (obs.type === "shutter" && obs.shutterTiming) {
            const cycle = obs.shutterTiming.openDuration + obs.shutterTiming.closeDuration;
            const t = (state.time * 1000 + obs.shutterTiming.offset) % cycle;
            isActive = t > obs.shutterTiming.openDuration;
          }

          if (isActive) {
             if (arrow.x > ox && arrow.x < ox + obs.width && arrow.y > oy && arrow.y < oy + obs.height) {
               handleMiss();
             }
          }
        }

        // 3. Target
        const dist = Math.hypot(arrow.x - state.targetPos.x, arrow.y - state.targetPos.y);
        const radius = 60 * lvl.targetSize;
        if (dist < radius) {
          // Hit! Check which ring
          let ring: RingType = "teal";
          let score = 10;
          if (dist < radius * 0.25) { ring = "bullseye"; score = 100; }
          else if (dist < radius * 0.5) { ring = "red"; score = 50; }
          else if (dist < radius * 0.75) { ring = "yellow"; score = 25; }

          handleHit(ring, score, arrow.x, arrow.y);
        }
      }

      // Draw
      ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Background Texture (Halftone / Sunburst)
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.translate(LOGICAL_WIDTH/2, LOGICAL_HEIGHT/2);
      ctx.rotate(state.time * 0.1);
      for(let i=0; i<24; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(LOGICAL_WIDTH, -50);
        ctx.lineTo(LOGICAL_WIDTH, 50);
        ctx.fillStyle = "#d97706";
        ctx.fill();
        ctx.rotate((Math.PI * 2) / 24);
      }
      ctx.restore();

      // Gust Zones
      ctx.save();
      for (const gust of lvl.gustZones) {
        const gx = (gust.x / 100) * LOGICAL_WIDTH;
        const gy = (gust.y / 100) * LOGICAL_HEIGHT;
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(gx, gy, gust.width, gust.height);
        
        // Animated wind lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const offset = (state.time * 200 * Math.sign(gust.strength)) % gust.width;
        for (let i=0; i<3; i++) {
           let lx = gx + (offset + i*40) % gust.width;
           ctx.moveTo(lx, gy + 20 + i*30);
           ctx.lineTo(lx + 20 * Math.sign(gust.strength), gy + 20 + i*30);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Obstacles
      for (const obs of lvl.obstacles) {
        const ox = (obs.x / 100) * LOGICAL_WIDTH;
        const oy = (obs.y / 100) * LOGICAL_HEIGHT;
        
        let isActive = true;
        let openness = 1;
        if (obs.type === "shutter" && obs.shutterTiming) {
          const cycle = obs.shutterTiming.openDuration + obs.shutterTiming.closeDuration;
          const t = (state.time * 1000 + obs.shutterTiming.offset) % cycle;
          if (t < obs.shutterTiming.openDuration) {
             isActive = false;
             openness = 0; // Fully open
          } else {
             // Closing animation
             const progress = (t - obs.shutterTiming.openDuration) / obs.shutterTiming.closeDuration;
             openness = 1;
          }
        }

        ctx.fillStyle = obs.type === "shutter" ? (isActive ? "#475569" : "transparent") : "#451a03"; // dark wood
        if (isActive) {
           ctx.fillRect(ox, oy, obs.width, obs.height);
           // Shutter grid
           if (obs.type === "shutter") {
              ctx.strokeStyle = "#1e293b";
              ctx.lineWidth = 4;
              ctx.strokeRect(ox, oy, obs.width, obs.height);
              ctx.beginPath();
              ctx.moveTo(ox, oy + obs.height/2);
              ctx.lineTo(ox + obs.width, oy + obs.height/2);
              ctx.stroke();
           }
        } else if (obs.type === "shutter") {
           // Draw rails
           ctx.fillStyle = "#94a3b8";
           ctx.fillRect(ox, oy - 20, obs.width, 20);
           ctx.fillRect(ox, oy + obs.height, obs.width, 20);
        }
      }

      // Target
      const tx = state.targetPos.x;
      const ty = state.targetPos.y;
      const r = 60 * lvl.targetSize;
      
      // Target stand
      ctx.fillStyle = "#78350f";
      ctx.fillRect(tx - 10, ty, 20, LOGICAL_HEIGHT - ty);

      // Rings
      const rings = [
        { color: "#2dd4bf", radius: r }, // Teal
        { color: "#fbbf24", radius: r * 0.75 }, // Yellow
        { color: "#ef4444", radius: r * 0.5 }, // Red
        { color: "#f59e0b", radius: r * 0.25 }, // Gold
      ];
      for (const ring of rings) {
        ctx.beginPath();
        // Perspective ellipse
        ctx.ellipse(tx, ty, ring.radius / 3, ring.radius, 0, 0, Math.PI * 2);
        ctx.fillStyle = ring.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.stroke();
      }

      // Trajectory Preview or Ghost
      if ((state.isDragging && state.previewMode !== "none") || (state.isDragging && state.ghostEnabled)) {
        const dx = state.dragStart.x - state.dragCurrent.x;
        const dy = state.dragStart.y - state.dragCurrent.y;
        
        // Calculate initial velocity (clamped)
        const maxDrag = 150;
        const dist = Math.min(Math.hypot(dx, dy), maxDrag);
        const ang = Math.atan2(dy, dx);
        const pwr = dist * 8; // scaling factor
        
        let simX = state.bowPos.x;
        let simY = state.bowPos.y;
        let simVx = Math.cos(ang) * pwr;
        let simVy = Math.sin(ang) * pwr;

        ctx.beginPath();
        ctx.moveTo(simX, simY);
        ctx.strokeStyle = state.ghostEnabled ? "rgba(255, 255, 255, 0.8)" : "rgba(0,0,0,0.3)";
        ctx.setLineDash([5, 10]);
        ctx.lineWidth = 2;

        const simStep = 0.05;
        const steps = state.previewMode === "half" && !state.ghostEnabled ? 15 : 40;
        
        for (let i = 0; i < steps; i++) {
          let ax = 0;
          let ay = GRAVITY;
          if (lvl.wind.enabled) ax += lvl.wind.strength * 50;
          
          simVx += ax * simStep;
          simVy += ay * simStep;
          simX += simVx * simStep;
          simY += simVy * simStep;
          ctx.lineTo(simX, simY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Bow
      ctx.save();
      ctx.translate(state.bowPos.x, state.bowPos.y);
      let bowAngle = 0;
      let drawDist = 0;
      if (state.isDragging) {
        const dx = state.dragStart.x - state.dragCurrent.x;
        const dy = state.dragStart.y - state.dragCurrent.y;
        bowAngle = Math.atan2(dy, dx);
        drawDist = Math.min(Math.hypot(dx, dy), 100);
      } else if (state.arrow.active) {
        bowAngle = state.arrow.angle;
      }
      ctx.rotate(bowAngle);

      // Draw Bow String
      ctx.beginPath();
      ctx.moveTo(0, -70);
      ctx.lineTo(-drawDist, 0);
      ctx.lineTo(0, 70);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Bow Arc
      ctx.beginPath();
      ctx.arc(20, 0, 70, -Math.PI/2, Math.PI/2);
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();

      // Arrow in bow (if dragging or idle and has arrows)
      if (!state.arrow.active && arrowsLeft > 0 && !state.won && !state.gameOver) {
        ctx.translate(-drawDist, 0);
        drawArrow(ctx);
      }
      ctx.restore();

      // Arrow in flight
      if (state.arrow.active) {
        ctx.save();
        ctx.translate(arrow.x, arrow.y);
        ctx.rotate(arrow.angle);
        drawArrow(ctx);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const drawArrow = (ctx: CanvasRenderingContext2D) => {
      // Shaft
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.lineTo(0, 0);
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 4;
      ctx.stroke();
      // Tip
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 3);
      ctx.fill();
      // Fletching
      ctx.fillStyle = "#1e3a5f";
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.lineTo(-50, -6);
      ctx.lineTo(-40, 0);
      ctx.lineTo(-50, 6);
      ctx.fill();
    };

    const handleMiss = () => {
      stateRef.current.arrow.active = false;
      playGameSound("miss", isMuted);
      triggerVibration([50]);
      
      setArrowsLeft(prev => {
        const next = prev - 1;
        if (next <= 0) {
          handleGameOver();
        }
        return next;
      });
    };

    const handleHit = (ring: RingType, score: number, hx: number, hy: number) => {
      const lvl = stateRef.current.levelData!;
      stateRef.current.arrow.active = false;
      
      const rings = ["teal", "yellow", "red", "bullseye"];
      const reqIdx = rings.indexOf(lvl.requiredRing);
      const hitIdx = rings.indexOf(ring);

      if (hitIdx >= reqIdx) {
         // Pass
         playGameSound(ring === "bullseye" ? "hit-bullseye" : "hit-ring", isMuted);
         triggerVibration([30, 50, 30]);
         setHitResult({ ring, score, x: hx, y: hy });
         stateRef.current.won = true;
         setWon(true);
         playGameSound("win", isMuted);

         // Save progress
         const nextLevel = lvl.id;
         if (nextLevel > highestUnlocked && nextLevel < totalLevelsCount) {
           setHighestUnlocked(nextLevel);
           localStorage.setItem("cx_archery_level", nextLevel.toString());
         }
      } else {
         // Fail required ring
         playGameSound("miss", isMuted);
         triggerVibration([50]);
         toast.error(`You need to hit ${lvl.requiredRing.toUpperCase()} or better!`);
         setArrowsLeft(prev => {
           const next = prev - 1;
           if (next <= 0) handleGameOver();
           return next;
         });
      }
    };

    const handleGameOver = () => {
      stateRef.current.gameOver = true;
      setGameOver(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      setLives(l => {
        const next = l - 1;
        if (next <= 0) {
          setTimeout(() => setShowLivesAd(true), 1000);
        }
        return Math.max(0, next);
      });
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [arrowsLeft, highestUnlocked, isMuted, totalLevelsCount]);

  // Pointer Handlers for Canvas
  const handlePointerDown = (e: React.PointerEvent) => {
    if (won || gameOver || arrowsLeft <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_WIDTH / rect.width;
    const scaleY = LOGICAL_HEIGHT / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    stateRef.current.isDragging = true;
    stateRef.current.dragStart = { x, y };
    stateRef.current.dragCurrent = { x, y };
    
    // Play tension sound periodically if wanted, or just once
    playGameSound("draw", isMuted, 0.1);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!stateRef.current.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (LOGICAL_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (LOGICAL_HEIGHT / rect.height);
    stateRef.current.dragCurrent = { x, y };
    
    // Calculate tension for pitch (0 to 1)
    const dist = Math.hypot(stateRef.current.dragStart.x - x, stateRef.current.dragStart.y - y);
    if (Math.random() > 0.9) playGameSound("draw", isMuted, Math.min(dist/150, 1));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!stateRef.current.isDragging) return;
    stateRef.current.isDragging = false;
    
    const dx = stateRef.current.dragStart.x - stateRef.current.dragCurrent.x;
    const dy = stateRef.current.dragStart.y - stateRef.current.dragCurrent.y;
    const maxDrag = 150;
    const dist = Math.min(Math.hypot(dx, dy), maxDrag);
    
    if (dist < 20) return; // Too weak, cancel

    const ang = Math.atan2(dy, dx);
    const pwr = dist * 8;
    
    stateRef.current.arrow = {
      x: stateRef.current.bowPos.x,
      y: stateRef.current.bowPos.y,
      vx: Math.cos(ang) * pwr,
      vy: Math.sin(ang) * pwr,
      angle: ang,
      active: true,
      length: 60
    };
    
    stateRef.current.ghostEnabled = false;
    playGameSound("release", isMuted);
    triggerVibration([40]);
  };

  const handleHint = () => {
    if (hintsLeft <= 0) {
      setShowHintAd(true);
      return;
    }
    setHintsLeft(h => h - 1);
    stateRef.current.ghostEnabled = true;
  };

  const handleRewardHint = () => {
    setShowHintAd(false);
    setHintsLeft(3);
  };

  const handleRewardLives = () => {
    setShowLivesAd(false);
    setLives(5);
    resetLevel();
  };

  const resetLevel = () => {
    if (lives <= 0) {
       setShowLivesAd(true);
       return;
    }
    loadLevel(levelIdx);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] select-none touch-none">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b-4 border-black bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/games" className="flex items-center gap-2 text-sm font-black text-black hover:scale-105 transition-transform">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} /> Back
          </Link>
          <h1 className="font-display text-2xl font-black tracking-tight uppercase">Archery Master</h1>
          <button onClick={() => setIsMuted(m => !m)} className="p-2 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors">
            {isMuted ? <VolumeX className="h-5 w-5 text-gray-500" strokeWidth={2.5} /> : <Volume2 className="h-5 w-5 text-black" strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Dashboard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowLevels(true)}
              className="flex items-center gap-2 bg-[#fbcfe8] px-5 py-2.5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all outline-none"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <span className="font-display text-xl font-black text-black tracking-tight uppercase">Level {levelIdx + 1}</span>
              <span className="text-[12px] font-black text-black/70 flex items-center bg-white px-2 py-0.5 rounded-full border-2 border-black">
                / {totalLevelsCount} <ChevronDown className="h-3 w-3 ml-1" strokeWidth={4} />
              </span>
            </button>
            <div className="flex items-center gap-1.5 bg-white px-4 py-2.5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div key={i} animate={i < lives ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0.3 }}>
                  <Heart className={`h-5 w-5 ${i < lives ? "text-black fill-black" : "text-black/30"}`} />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-stretch gap-4">
            <div className="flex-1 bg-[#bfdbfe] border-4 border-black p-3 flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
              <div className="text-[12px] font-black text-black/70 uppercase tracking-widest mb-1">Target</div>
              <div className="font-display text-lg font-black text-black leading-none uppercase">{levelData?.requiredRing || "---"}</div>
            </div>
            <div className="flex-1 bg-[#bbf7d0] border-4 border-black p-3 flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_SM }}>
              <div className="text-[12px] font-black text-black/70 uppercase tracking-widest mb-1">Arrows</div>
              <div className="font-display text-3xl font-black text-black leading-none">{arrowsLeft}</div>
            </div>
            <Button
              onClick={handleHint}
              disabled={won || gameOver}
              className={`w-[60px] sm:w-[70px] h-auto flex-shrink-0 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center p-0 ${hintsLeft > 0 ? "bg-[#fef08a] text-black" : "bg-gray-200 text-gray-400 opacity-60"}`}
              style={{ borderRadius: WOBBLY_SM }}
            >
              <div className="flex flex-col items-center justify-center">
                <Lightbulb className="h-6 w-6 sm:h-7 sm:w-7 mb-1" strokeWidth={3} />
                <span className="text-[11px] font-black leading-none bg-white border-2 border-black text-black px-2 py-0.5 rounded-full">{hintsLeft}</span>
              </div>
            </Button>
            <Button
              onClick={resetLevel}
              className="w-[60px] sm:w-[70px] h-auto flex-shrink-0 border-4 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 transition-all hover:translate-y-1 hover:shadow-none p-0 flex items-center justify-center"
              style={{ borderRadius: WOBBLY_SM }}
            >
              <RotateCcw className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={3} />
            </Button>
          </div>
        </div>

        {/* Play Area */}
        <motion.div 
           className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-[#fef08a]"
           animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
           transition={{ duration: 0.4 }}
        >
          <canvas
            ref={canvasRef}
            width={LOGICAL_WIDTH}
            height={LOGICAL_HEIGHT}
            className="w-full h-full cursor-crosshair touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          
          {/* Wind Overlay UI */}
          {levelData?.wind.enabled && (
             <div className="absolute top-4 right-4 bg-white/80 border-2 border-black px-3 py-1.5 rounded-full flex items-center gap-2 font-display font-black">
                <WindIcon className="w-5 h-5" />
                <span>{Math.abs(levelData.wind.strength)}</span>
                {levelData.wind.strength > 0 ? <ArrowLeft className="w-4 h-4 rotate-180" /> : <ArrowLeft className="w-4 h-4" />}
             </div>
          )}

          {/* Win Overlay */}
          <AnimatePresence>
             {won && hitResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
                >
                   <div className="bg-white border-4 border-black p-6 rounded-2xl flex flex-col items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
                      <Target className="w-16 h-16 mb-2 text-[#f59e0b]" strokeWidth={2.5} />
                      <h2 className="font-display font-black text-3xl uppercase tracking-widest text-[#d97706] mb-1">
                        {hitResult.ring === "bullseye" ? "BULLSEYE!" : "GREAT SHOT!"}
                      </h2>
                      <p className="font-black text-xl mb-6">+{hitResult.score} PTS</p>
                      
                      {levelIdx < totalLevelsCount - 1 ? (
                         <Button onClick={() => loadLevel(levelIdx + 1)} className="bg-[#bbf7d0] text-black border-4 border-black font-black text-xl py-6 px-10 uppercase hover:bg-[#86efac] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                           Next Level <ChevronRight className="ml-2 w-6 h-6" strokeWidth={4} />
                         </Button>
                      ) : (
                         <Button className="bg-[#fef08a] text-black border-4 border-black font-black text-xl py-6 px-10 uppercase hover:bg-[#fde047] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                           Game Completed! 🏆
                         </Button>
                      )}
                   </div>
                </motion.div>
             )}

             {gameOver && !won && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
                >
                   <div className="bg-white border-4 border-black p-6 rounded-2xl flex flex-col items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" style={{ borderRadius: WOBBLY_MD }}>
                      <X className="w-16 h-16 mb-2 text-red-500" strokeWidth={4} />
                      <h2 className="font-display font-black text-3xl uppercase tracking-widest mb-6">OUT OF ARROWS</h2>
                      <Button onClick={resetLevel} className="bg-[#bfdbfe] text-black border-4 border-black font-black text-xl py-6 px-10 uppercase hover:bg-[#93c5fd] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        Try Again
                      </Button>
                   </div>
                </motion.div>
             )}
          </AnimatePresence>
        </motion.div>

        {/* How to Play Footer */}
        <div className="bg-white rounded-[20px] p-5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowHelp(!showHelp)}>
            <div className="flex items-center gap-3">
              <div className="bg-[#fbcfe8] p-2 rounded-lg border-2 border-black">
                <Target className="h-5 w-5 text-black" strokeWidth={3} />
              </div>
              <h2 className="font-display font-black text-lg tracking-tight uppercase">How to Play</h2>
            </div>
            <ChevronDown className={`h-6 w-6 transition-transform ${showHelp ? "rotate-180" : ""}`} strokeWidth={3} />
          </div>
          <AnimatePresence>
            {showHelp && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-4 space-y-3 font-medium text-sm leading-relaxed border-t-2 border-dashed border-gray-200 mt-4">
                  <p>1. <strong>Drag backward</strong> anywhere on the screen (like pulling a slingshot) to aim and set power.</p>
                  <p>2. Watch out for <strong>Wind</strong> and <strong>Moving Targets</strong> in higher levels.</p>
                  <p>3. Hit the required target ring before running out of arrows.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Level Selector Modal */}
      <AnimatePresence>
        {showLevels && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-md bg-white rounded-[32px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-black text-2xl uppercase tracking-widest">Select Level</h2>
                <button onClick={() => setShowLevels(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="h-6 w-6" /></button>
              </div>
              <div className="overflow-y-auto grid grid-cols-5 gap-3 p-2">
                {Array.from({ length: totalLevelsCount }).map((_, i) => (
                  <button
                    key={i}
                    disabled={i > highestUnlocked}
                    onClick={() => { loadLevel(i); setLevelIdx(i); setShowLevels(false); }}
                    className={`aspect-square flex items-center justify-center font-display font-black text-lg border-2 border-black transition-transform ${i === levelIdx ? "bg-[#fbcfe8] scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : i <= highestUnlocked ? "bg-white hover:bg-gray-100" : "bg-gray-200 text-gray-400 opacity-50"}`}
                    style={{ borderRadius: WOBBLY_SM }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <HintRewardAdModal isOpen={showHintAd} onClose={() => setShowHintAd(false)} onRewardGranted={handleRewardHint} mode="hint" />
      <HintRewardAdModal isOpen={showLivesAd} onClose={() => { setShowLivesAd(false); setLives(0); }} onRewardGranted={handleRewardLives} mode="extra-lives" />
    </div>
  );
}
