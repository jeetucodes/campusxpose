import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Play, Lightbulb, ExternalLink, ShieldCheck, Heart, Zap, Gift, Eye } from "lucide-react";
import { useAds, type Ad } from "@/hooks/useAds";

interface HintRewardAdModalProps {
  isOpen: boolean;
  mode?: "hint" | "extra-lives";
  onClose: () => void;
  onRewardGranted: () => void;
  onGameOverConfirm?: () => void;
}

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const WOBBLY_SM = "15px 5px 12px 5px / 5px 12px 5px 15px";

export default function HintRewardAdModal({
  isOpen,
  mode = "hint",
  onClose,
  onRewardGranted,
  onGameOverConfirm,
}: HintRewardAdModalProps) {
  const gameAds = useAds("games");
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [canSkipOrClaim, setCanSkipOrClaim] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(3);
      setCanSkipOrClaim(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkipOrClaim(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const FALLBACK_AD: Ad = {
    id: "campusxpose_reward_ad",
    title: "CampusXpose Student Perks 🚀",
    kind: "banner",
    body: "Explore verified campus chats, live student events, and arcade leaderboards across your university!",
    link_url: "/",
    media_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
    embed_url: null,
    cta_label: "Explore CampusXpose",
    show_home: false,
    show_global: false,
    show_college: false,
    show_games: true,
    active: true,
    sort_order: 0,
  };

  const currentAd: Ad = gameAds.length > 0 ? gameAds[activeAdIndex % gameAds.length] : FALLBACK_AD;

  if (!isOpen) return null;

  const handleClaim = () => {
    onRewardGranted();
  };

  const progressPct = ((3 - countdown) / 3) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 text-black select-none"
        onClick={canSkipOrClaim ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.85, y: 30, rotate: -1 }}
          animate={{ scale: 1, y: 0, rotate: 0 }}
          exit={{ scale: 0.85, y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-white border-4 border-black p-5 sm:p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative flex flex-col space-y-4 overflow-hidden"
          style={{ borderRadius: WOBBLY_MD }}
        >
          {/* Close X Button (Only active/visible after 3s countdown) */}
          {canSkipOrClaim ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-amber-300 hover:bg-amber-400 border-2 border-black flex items-center justify-center cursor-pointer z-30 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Close Ad"
            >
              <X className="h-5 w-5 text-black" strokeWidth={3} />
            </motion.button>
          ) : (
            <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 rounded-full text-[11px] font-black border-2 border-black z-30 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 animate-pulse">
              <Eye className="h-3.5 w-3.5 text-amber-300" />
              <span>Skip in {countdown}s</span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-3.5 border-b-4 border-black pb-3.5">
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`p-3 border-3 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                mode === "extra-lives" ? "bg-gradient-to-br from-rose-300 to-red-400" : "bg-gradient-to-br from-amber-200 to-yellow-400"
              }`}
            >
              {mode === "extra-lives" ? (
                <Heart className="h-7 w-7 text-black fill-black animate-pulse" />
              ) : (
                <Lightbulb className="h-7 w-7 text-black fill-black" />
              )}
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#bbf7d0] text-black px-2.5 py-0.5 border-2 border-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                  <Sparkles className="h-3 w-3 fill-black text-black" /> Sponsored Game Ad
                </span>
              </div>
              <h2 className="font-display text-2xl font-black uppercase text-black leading-tight mt-1 tracking-tight">
                {mode === "extra-lives" ? "Out of Lives! 💔" : "Unlock Free Hint 💡"}
              </h2>
            </div>
          </div>

          {/* Ad Container Box */}
          <div className="p-4 bg-gradient-to-br from-amber-50 via-yellow-100 to-amber-100 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3 relative overflow-hidden">

            {/* Ad Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-md">
                  {currentAd.kind === "video" ? "📹 VIDEO AD" : "📢 SPONSORED"}
                </span>

                {currentAd.link_url && (
                  <a
                    href={currentAd.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-black text-blue-700 hover:text-blue-900 bg-white px-2.5 py-0.5 border-2 border-black rounded-lg shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform flex items-center gap-1"
                  >
                    <span>Visit Sponsor</span> <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <h3 className="font-display text-base font-black uppercase text-black line-clamp-1">
                {currentAd.title}
              </h3>

              {currentAd.body && (
                <p className="text-xs font-bold text-black/85 line-clamp-2 leading-relaxed">
                  {currentAd.body}
                </p>
              )}

              {/* Video Player or Image Display */}
              {currentAd.kind === "video" && currentAd.embed_url ? (
                <div className="w-full h-44 rounded-xl border-3 border-black overflow-hidden bg-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative">
                  <iframe
                    src={currentAd.embed_url}
                    title={currentAd.title}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              ) : currentAd.media_url ? (
                <div className="w-full h-40 rounded-xl border-3 border-black overflow-hidden bg-black/10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative group">
                  <img
                    src={currentAd.media_url}
                    alt={currentAd.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="py-4 text-center space-y-1">
                  <div className="text-3xl animate-bounce">⚡</div>
                  <p className="text-xs font-black text-black uppercase">Verified Campus Partner</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress / Timer Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-black">
              <span>{canSkipOrClaim ? "✨ Reward Ready!" : `Watching Ad (${countdown}s remaining)`}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 border-2 border-black rounded-full overflow-hidden p-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ ease: "linear", duration: 0.3 }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {canSkipOrClaim ? (
              <div className="space-y-2">
                <motion.button
                  initial={{ scale: 0.9, y: 10 }}
                  animate={{ scale: [1, 1.02, 1], y: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClaim}
                  className={`w-full text-black py-3.5 px-4 border-4 border-black font-display font-black text-sm uppercase tracking-wider shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2.5 cursor-pointer ${
                    mode === "extra-lives"
                      ? "bg-gradient-to-r from-rose-300 via-pink-300 to-red-300 hover:from-rose-400 hover:to-red-400"
                      : "bg-gradient-to-r from-emerald-300 via-green-300 to-teal-300 hover:from-emerald-400 hover:to-teal-400"
                  }`}
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  <Gift className="h-6 w-6 text-black fill-black animate-bounce" />
                  <span>
                    {mode === "extra-lives" ? "🎁 CLAIM +3 LIVES & PLAY NOW" : "💡 CLAIM FREE HINT NOW"}
                  </span>
                </motion.button>

                {mode === "extra-lives" && onGameOverConfirm && (
                  <button
                    onClick={() => {
                      onGameOverConfirm();
                      onClose();
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-black/80 hover:text-black py-2 rounded-xl border-2 border-black text-xs font-black uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    No thanks, End Game
                  </button>
                )}
              </div>
            ) : (
              <button
                disabled
                className="w-full bg-gray-200 text-black/60 py-3.5 border-4 border-black font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 opacity-80 cursor-not-allowed shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                style={{ borderRadius: WOBBLY_SM }}
              >
                <Zap className="h-4 w-4 animate-spin" />
                <span>Unlocking Reward in {countdown}s...</span>
              </button>
            )}
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
