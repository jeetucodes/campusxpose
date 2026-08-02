import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Play, Lightbulb, ExternalLink, ShieldCheck, Heart, RefreshCw } from "lucide-react";
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
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 text-black select-none"
        onClick={canSkipOrClaim ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.88, y: 25 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.88, y: 25 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col space-y-4 overflow-hidden"
          style={{ borderRadius: WOBBLY_MD }}
        >
          {/* Close X Button (Only active/visible after 3s countdown as requested) */}
          {canSkipOrClaim ? (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-black flex items-center justify-center cursor-pointer z-20 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              title="Close Ad"
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          ) : (
            <div className="absolute top-4 right-4 bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-black border border-black z-20 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
              <span>Skip in {countdown}s</span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-3 border-b-3 border-black pb-3">
            <div className={`p-2.5 border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              mode === "extra-lives" ? "bg-[#fca5a5]" : "bg-[#fef08a]"
            }`}>
              {mode === "extra-lives" ? (
                <Heart className="h-6 w-6 text-black fill-black animate-pulse" />
              ) : (
                <Lightbulb className="h-6 w-6 text-black fill-black" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#bbf7d0] px-2 py-0.5 border border-black rounded-full">
                  Sponsored Game Ad
                </span>
                <span className="text-[10px] font-bold text-black/60">
                  {mode === "extra-lives" ? "Watch Ad for +3 Lives" : "Watch Ad for Free Hint"}
                </span>
              </div>
              <h2 className="font-display text-xl font-black uppercase text-black leading-none mt-1">
                {mode === "extra-lives" ? "Out of Lives! 💔" : "Unlock Free Hint 💡"}
              </h2>
            </div>
          </div>

          {/* Ad Container */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-100 border-3 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-3">
            {currentAd ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-black uppercase text-black line-clamp-1">
                    {currentAd.title}
                  </h3>
                  {currentAd.link_url && (
                    <a
                      href={currentAd.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>Visit</span> <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {currentAd.body && (
                  <p className="text-xs font-bold text-black/80 line-clamp-2 leading-relaxed">
                    {currentAd.body}
                  </p>
                )}

                {/* Video or Image Media */}
                {currentAd.kind === "video" && currentAd.embed_url ? (
                  <div className="w-full h-44 rounded-xl border-2 border-black overflow-hidden bg-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <iframe
                      src={currentAd.embed_url}
                      title={currentAd.title}
                      className="w-full h-full border-0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>
                ) : currentAd.media_url ? (
                  <div className="w-full h-36 rounded-xl border-2 border-black overflow-hidden bg-black/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <img
                      src={currentAd.media_url}
                      alt={currentAd.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              /* Fallback Sponsored Partner Ad */
              <div className="space-y-2 text-center py-2">
                <div className="text-4xl animate-bounce">🚀</div>
                <h3 className="font-display text-lg font-black uppercase text-black">
                  CampusXpose Student Deals
                </h3>
                <p className="text-xs font-bold text-black/85 leading-snug max-w-xs mx-auto">
                  Discover local campus events, student discussions, and exclusive perks!
                </p>
                <div className="pt-1 flex justify-center">
                  <span className="text-[10px] font-black bg-white px-3 py-1 border-2 border-black rounded-full shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified Partner Ad
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {canSkipOrClaim ? (
              <div className="space-y-2">
                <motion.button
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClaim}
                  className={`w-full text-black py-3 border-3 border-black font-display font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 cursor-pointer ${
                    mode === "extra-lives" ? "bg-[#fca5a5] hover:bg-rose-300" : "bg-[#bbf7d0] hover:bg-emerald-300"
                  }`}
                  style={{ borderRadius: WOBBLY_SM }}
                >
                  <Sparkles className="h-5 w-5 fill-black" />
                  <span>
                    {mode === "extra-lives" ? "📺 Claim +3 Extra Lives & Continue" : "💡 Claim Free Hint Now"}
                  </span>
                </motion.button>

                {mode === "extra-lives" && onGameOverConfirm && (
                  <button
                    onClick={() => {
                      onGameOverConfirm();
                      onClose();
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-black/70 hover:text-black py-2 rounded-xl border-2 border-black text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    No thanks, End Game
                  </button>
                )}
              </div>
            ) : (
              <button
                disabled
                className="w-full bg-gray-200 text-black/60 py-3 border-3 border-black font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
                style={{ borderRadius: WOBBLY_SM }}
              >
                <span>Reward Unlocks in {countdown}s...</span>
              </button>
            )}
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
