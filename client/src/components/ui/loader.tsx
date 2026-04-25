import { Loader2 } from "lucide-react";
import { Icon, type IconSize } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "sm" | "lg";
}

const SIZE_MAP: Record<NonNullable<LoaderProps["size"]>, IconSize> = {
  sm: "sm",
  default: "lg",
  lg: "xl",
};

export function Loader({ size = "default", className, ...props }: LoaderProps) {
  return (
    <div className={cn("animate-spin", className)} {...props}>
      <Icon icon={Loader2} size={SIZE_MAP[size]} className="text-muted-foreground" />
    </div>
  );
}
