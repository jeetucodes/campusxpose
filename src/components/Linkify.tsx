import React from "react";

export function Linkify({ text }: { text: string }) {
  if (!text) return null;
  // Match http://, https://, or www.
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          const href = part.startsWith("www.") ? `https://${part}` : part;
          const displayUrl = part.length > 35 ? part.substring(0, 25) + "..." + part.substring(part.length - 10) : part;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block max-w-full break-all font-bold text-blue-600 bg-blue-500/15 px-1.5 py-0.5 rounded-md hover:bg-blue-500/25 hover:text-blue-700 transition-colors underline underline-offset-2 decoration-blue-500/40"
              onClick={(e) => e.stopPropagation()}
            >
              {displayUrl}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}
