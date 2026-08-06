import { useState } from "react";

export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 150;
  
  if (!isLong) return <p className="mt-3 sm:mt-4 text-sm sm:text-base font-medium leading-relaxed text-foreground group-hover:text-accent transition-colors">{text}</p>;
  
  return (
    <div>
      <p className={`mt-3 sm:mt-4 text-sm sm:text-base font-medium leading-relaxed text-foreground group-hover:text-accent transition-colors ${!expanded ? "line-clamp-3" : ""}`}>
        {text}
      </p>
      <button 
        onClick={(e) => {
          e.preventDefault(); 
          setExpanded(!expanded);
        }}
        className="text-xs sm:text-sm font-bold text-accent mt-2 py-1.5 px-3 border-2 border-accent/20 bg-accent/5 hover:bg-accent/10 rounded-md transition-colors inline-block active:scale-95"
      >
        {expanded ? "See less" : "Read full report..."}
      </button>
    </div>
  );
}
