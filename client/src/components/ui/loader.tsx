import { Loader2 as LucideLoader } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "sm" | "lg";
}

export function Loader({ size = "default", className, ...props }: LoaderProps) {
  return (
    <div className={cn("animate-spin", className)} {...props}>
      <LucideLoader
        className={cn(
          "text-muted-foreground",
          {
            "h-4 w-4": size === "sm",
            "h-6 w-6": size === "default",
            "h-8 w-8": size === "lg",
          }
        )}
      />
    </div>
  );
}
