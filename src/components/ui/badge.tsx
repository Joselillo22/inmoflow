import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

function Badge({
  className,
  variant = "default",
  size = "sm",
  dot,
  removable,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
        {
          "rounded-md": size === "sm",
          "rounded-lg": size === "md",
        },
        {
          "px-2.5 py-0.5 text-xs": size === "sm",
          "px-3 py-1 text-sm": size === "md",
        },
        {
          "bg-muted text-secondary": variant === "default",
          "bg-success-light text-success": variant === "success",
          "bg-warning-light text-warning": variant === "warning",
          "bg-danger-light text-danger": variant === "danger",
          "bg-primary-light text-primary": variant === "info",
          "border border-border text-secondary bg-transparent": variant === "outline",
        },
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-2 h-2 rounded-full", {
            "bg-secondary": variant === "default",
            "bg-success": variant === "success",
            "bg-warning": variant === "warning",
            "bg-danger": variant === "danger",
            "bg-primary": variant === "info",
          })}
        />
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );
}

export { Badge };
export type { BadgeProps };
