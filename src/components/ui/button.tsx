"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium cursor-pointer select-none",
          "transition-all duration-200 ease-out",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          "active:scale-[0.98]",
          {
            "bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md": variant === "primary",
            "bg-secondary/10 text-foreground hover:bg-secondary/20": variant === "secondary",
            "bg-danger text-white shadow-sm hover:bg-red-700 hover:shadow-md": variant === "danger",
            "bg-success text-white shadow-sm hover:bg-green-700 hover:shadow-md": variant === "success",
            "bg-transparent text-foreground hover:bg-muted": variant === "ghost",
            "bg-transparent text-primary border border-primary/30 hover:bg-primary-50 hover:border-primary": variant === "outline",
          },
          {
            "h-8 px-3 text-xs rounded-md": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-5 text-base": size === "lg",
            "h-9 w-9 p-0": size === "icon",
          },
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
