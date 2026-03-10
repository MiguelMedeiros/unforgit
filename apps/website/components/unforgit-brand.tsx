import { cn } from "@/lib/utils";

export function UnforgitBrand({
  className,
}: {
  className?: string;
}) {
  return (
    <span className={cn(className)}>
      <span className="underline decoration-2 underline-offset-[3px]">
        un
      </span>
      forgit
    </span>
  );
}
