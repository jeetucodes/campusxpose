import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "wobbly-oval inline-flex items-center justify-center gap-2 whitespace-nowrap border-[3px] border-border text-base font-sans cursor-pointer transition-transform duration-100 shadow-ink hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_var(--ink)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5da1]/30 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-white text-foreground hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-accent text-accent-foreground hover:bg-accent/90",
        outline: "bg-white text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-muted text-foreground hover:bg-[#2d5da1] hover:text-white",
        ghost: "border-transparent shadow-none hover:translate-x-0 hover:translate-y-0 hover:shadow-none hover:bg-muted",
        link: "border-transparent shadow-none hover:translate-x-0 hover:translate-y-0 hover:shadow-none text-[#2d5da1] wavy-underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-8 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
