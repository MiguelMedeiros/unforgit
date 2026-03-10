import { cn } from "@/lib/utils";

export function UnforgitBrand({
  className,
  capitalize = false,
}: {
  className?: string;
  capitalize?: boolean;
}) {
  return (
    <span className={cn(className)}>
      <span className="underline decoration-2 underline-offset-[3px]">
        {capitalize ? "Un" : "un"}
      </span>
      forgit
    </span>
  );
}
