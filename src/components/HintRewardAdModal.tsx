import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Lightbulb, ExternalLink, Heart, Zap, Gift, Eye, Video } from "lucide-react";
import { useAds, type Ad } from "@/hooks/useAds";

interface HintRewardAdModalProps {
  isOpen: boolean;
  mode?: "hint" | "extra-lives";
  onClose: () => void;
  onRewardGranted: () => void;
  onGameOverConfirm?: () => void;
}

// Global counter so every open picks the NEXT ad in the list
let globalAdOpenCount = 0;

export default function HintRewardAdModal({
  isOpen,
  mode = "hint",
  onClose,
  onRewardGranted,
  onGameOverConfirm,
}: HintRewardAdModalProps) {
  const gameAds = useAds("games");
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [adKey, setAdKey] = useState(0);
  const [askingConfirmation, setAskingConfirmation] = useState(mode === "extra-lives");
  const [countdown, setCountdown] = useState(3);
  const [canClose, setCanClose] = useState(false);
  const prevIsOpen = useRef(false);

  const FALLBACK_AD: Ad = {
    id: "campusxpose_reward_ad",
    title: "CampusXpose Student Perks 🚀",
    kind: "banner",
    body: "Explore verified campus chats, live student events, and arcade leaderboards across your university!",
    link_url: "/",
    media_url:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900&auto=format&fit=crop&q=80",
    embed_url: null,
    cta_label: "Explore CampusXpose",
    show_home: false,
    show_global: false,
    show_college: false,
    show_games: true,
    active: true,
    sort_order: 0,
    timer_seconds: 3,
  };

  const ads = gameAds.length > 0 ? gameAds : [FALLBACK_AD];
  const currentAd: Ad = ads[activeAdIndex % ads.length];
  const adDuration = Math.max(1, currentAd?.timer_seconds ?? 3);

  // Each time modal opens -> advance to next ad
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      globalAdOpenCount += 1;
      setAskingConfirmation(mode === "extra-lives");
      if (gameAds.length > 0) {
        setActiveAdIndex(Math.max(0, globalAdOpenCount - 1) % gameAds.length);
      }
      setCanClose(false);
      setAdKey((k) => k + 1);
    }
    if (!isOpen) {
      setCanClose(false);
      setAskingConfirmation(mode === "extra-lives");
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, mode, gameAds.length]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || askingConfirmation) return;
    setCountdown(adDuration);
    setCanClose(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, askingConfirmation, adDuration, adKey]);

  if (!isOpen) return null;

  const isDirectVideo = (url: string | null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.endsWith(".mp4") ||
      lower.endsWith(".webm") ||
      lower.endsWith(".ogg") ||
      lower.endsWith(".m4v")
    );
  };

  const getAutoPlayEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("autoplay=1")) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}autoplay=1&muted=1&playsinline=1&controls=1`;
  };

  const isVideoAd =
    currentAd.kind === "video" || isDirectVideo(currentAd.media_url) || !!currentAd.embed_url;
  const progressPct = Math.min(100, Math.max(0, ((adDuration - countdown) / adDuration) * 100));

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 text-[#2d2d2d] select-none overflow-y-auto"
      >
        <motion.div
          key="modal"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md bg-[#fdfbf7] sm:rounded-3xl rounded-t-3xl border-2 border-[#2d2d2d] sm:shadow-[8px_8px_0px_0px_#2d2d2d] relative flex flex-col overflow-hidden text-[#2d2d2d]"
        >
          {/* Drag Handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-[#2d2d2d]/25" />
          </div>

          {/* CONFIRMATION SCREEN */}
          {askingConfirmation ? (
            <div className="flex flex-col items-center text-center px-6 pt-4 pb-7 space-y-4">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-[#f5f1e8] border border-[#2d2d2d]/40 flex items-center justify-center hover:bg-[#e5e0d8] transition-colors cursor-pointer z-30"
              >
                <X className="h-4 w-4 text-[#6b6660]" />
              </button>

              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="w-16 h-16 bg-[#ff4d4d] border-2 border-[#2d2d2d] rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_#2d2d2d]"
              >
                <Heart className="h-8 w-8 text-white fill-white" />
              </motion.div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-display font-bold uppercase tracking-wider bg-[#fff9c4] text-[#2d2d2d] px-3 py-1 rounded-full border border-[#2d2d2d]">
                  <Zap className="h-3 w-3 fill-[#ff4d4d] text-[#ff4d4d]" /> Out of Lives
                </span>
                <h2 className="font-display text-2xl font-bold text-[#2d2d2d]">Out of Lives! 💔</h2>
                <p className="text-sm text-[#6b6660] font-sans leading-relaxed max-w-xs mx-auto">
                  Kya aap ek chhota sa ad dekh kar{" "}
                  <span className="text-[#ff4d4d] font-bold">+3 Extra Lives</span> lena chahte hain?
                </p>
              </div>

              <div className="w-full space-y-2.5 pt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setAskingConfirmation(false)}
                  className="w-full bg-[#3a8a4f] hover:bg-[#2e6f3e] text-white font-display font-bold py-3.5 rounded-2xl text-base border-2 border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Video className="h-5 w-5 text-white" />
                  Watch Ad for +3 Lives 🎬
                </motion.button>
                <button
                  onClick={() => {
                    if (onGameOverConfirm) onGameOverConfirm();
                    onClose();
                  }}
                  className="w-full bg-[#f5f1e8] hover:bg-[#e5e0d8] text-[#6b6660] hover:text-[#2d2d2d] font-display font-bold py-2.5 rounded-2xl border border-[#2d2d2d]/40 text-sm transition-colors cursor-pointer"
                >
                  Game Over — End Game 💀
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* AD SCREEN */}

              {/* X Close button — only visible after 3s countdown */}
              {canClose && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 z-30 h-9 w-9 rounded-full bg-[#fdfbf7] border-2 border-[#2d2d2d] flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_0px_#2d2d2d] hover:bg-[#fff9c4] transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4 stroke-[2.5] text-[#2d2d2d]" />
                </motion.button>
              )}

              {/* Countdown badge — top-left */}
              {!canClose && (
                <div className="absolute top-4 left-4 z-30">
                  <div className="px-3 py-1 rounded-full text-xs font-display font-bold flex items-center gap-1.5 transition-all bg-[#2d2d2d] text-[#fff9c4] animate-pulse">
                    <Eye className="h-3 w-3" />
                    {countdown}s
                  </div>
                </div>
              )}

              {/* MEDIA HERO */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={adKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full relative overflow-hidden bg-[#1a1a1a]"
                  style={{ minHeight: 210 }}
                >
                  {currentAd.embed_url ? (
                    <div className="w-full aspect-video">
                      <iframe
                        src={getAutoPlayEmbedUrl(currentAd.embed_url)}
                        title={currentAd.title}
                        className="w-full h-full border-0"
                        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                        allowFullScreen
                      />
                    </div>
                  ) : isDirectVideo(currentAd.media_url) ? (
                    <div className="w-full aspect-video bg-black flex items-center justify-center">
                      <video
                        src={currentAd.media_url!}
                        autoPlay
                        muted
                        loop
                        playsInline
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : currentAd.media_url ? (
                    <div
                      className="w-full relative flex items-center justify-center"
                      style={{ minHeight: 210 }}
                    >
                      <img
                        src={currentAd.media_url}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 w-full h-full object-cover blur-lg opacity-35 scale-110 pointer-events-none"
                      />
                      <img
                        src={currentAd.media_url}
                        alt={currentAd.title}
                        className="relative z-10 max-w-full max-h-[260px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center space-y-1">
                      <span className="text-4xl animate-bounce">⚡</span>
                      <p className="text-xs text-white font-display font-bold uppercase tracking-wider">
                        Campus Partner
                      </p>
                    </div>
                  )}

                  {/* Ad type badge */}
                  <div className="absolute bottom-3 left-3 z-20">
                    <span className="bg-[#2d2d2d]/80 backdrop-blur-sm text-[#fff9c4] text-[10px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                      {isVideoAd ? (
                        <>
                          <Video className="h-3 w-3 animate-pulse" /> Video Ad
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" /> Sponsored
                        </>
                      )}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* AD TEXT */}
              <div className="px-5 pt-3.5 pb-2 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-base leading-snug text-[#2d2d2d] flex-1 pr-2">
                    {currentAd.title}
                  </h3>
                  {currentAd.link_url && (
                    <a
                      href={currentAd.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[11px] font-display font-bold text-[#2d5da1] bg-[#f5f1e8] border border-[#2d2d2d] px-2.5 py-1 rounded-xl flex items-center gap-1 hover:scale-105 transition-transform shadow-[1.5px_1.5px_0px_0px_#2d2d2d]"
                    >
                      Visit <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {currentAd.body && (
                  <p className="text-xs text-[#6b6660] font-sans leading-relaxed line-clamp-2">
                    {currentAd.body}
                  </p>
                )}
              </div>

              <div className="mx-5 border-t border-[#2d2d2d]/15" />

              {/* Mode label */}
              <div className="px-5 pt-3 flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl border-2 border-[#2d2d2d] shadow-[2px_2px_0px_0px_#2d2d2d] ${
                    mode === "extra-lives" ? "bg-[#ff4d4d]" : "bg-[#fff9c4]"
                  }`}
                >
                  {mode === "extra-lives" ? (
                    <Heart className="h-4 w-4 text-white fill-white" />
                  ) : (
                    <Lightbulb className="h-4 w-4 text-[#2d2d2d] fill-[#2d2d2d]" />
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6b6660]">
                    {mode === "extra-lives"
                      ? "Watch Ad · Get +3 Lives"
                      : "Watch Ad · Get Free Hint"}
                  </p>
                  <p className="text-[10px] text-[#6b6660]">
                    {canClose
                      ? "✨ Reward ready — claim now!"
                      : `Wait ${countdown}s to unlock reward`}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-5 pt-2">
                <div className="w-full h-2 bg-[#e5e0d8] rounded-full overflow-hidden border border-[#2d2d2d]/20">
                  <motion.div
                    className={`h-full rounded-full ${canClose ? "bg-[#ff4d4d]" : "bg-[#3a8a4f]"}`}
                    initial={{ width: "0%" }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ ease: "linear", duration: 0.3 }}
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="px-5 pt-3 pb-6 space-y-2">
                {canClose ? (
                  <motion.button
                    animate={{ scale: [1, 1.015, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onRewardGranted}
                    className={`w-full py-4 rounded-2xl font-display font-bold text-base border-2 border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d] flex items-center justify-center gap-2 cursor-pointer text-white transition-colors ${
                      mode === "extra-lives"
                        ? "bg-[#ff4d4d] hover:bg-[#e63939]"
                        : "bg-[#3a8a4f] hover:bg-[#2e6f3e]"
                    }`}
                  >
                    <Gift className="h-5 w-5 fill-white animate-bounce" />
                    {mode === "extra-lives"
                      ? "Claim +3 Lives & Play Now 🎁"
                      : "Claim Free Hint Now 💡"}
                  </motion.button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-[#e5e0d8] text-[#6b6660] py-4 rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-2 border border-[#2d2d2d]/30 cursor-not-allowed opacity-75"
                  >
                    <Zap className="h-4 w-4 animate-spin text-[#2d2d2d]" />
                    Unlocking in {countdown}s...
                  </button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
