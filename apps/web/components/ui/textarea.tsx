import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-border/50 bg-white/[0.04] px-3.5 py-3 text-[13px] transition-all duration-200 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-ring/50 focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40 resize-none",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
