import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "wobbly-sm flex h-11 w-full border-2 border-border bg-white px-4 py-1 text-base font-sans transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-[#2d5da1] focus-visible:ring-2 focus-visible:ring-[#2d5da1]/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-base",
          className,
        )}

        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
