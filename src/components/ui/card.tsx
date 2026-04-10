import { cn } from "@/lib/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined" | "elevated";
  accent?: string;
}

function Card({ className, variant = "default", accent, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card transition-all duration-200",
        {
          "shadow-[var(--shadow-sm)] border border-border/50": variant === "default",
          "border border-border": variant === "outlined",
          "shadow-[var(--shadow-md)]": variant === "elevated",
        },
        accent && "border-l-[3px]",
        className
      )}
      style={accent ? { borderLeftColor: accent } : undefined}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-5 pb-1", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold text-foreground tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-secondary mt-0.5", className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
