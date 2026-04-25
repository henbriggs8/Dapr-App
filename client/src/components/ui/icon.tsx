import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

export const ICON_STROKE_WIDTH = 2;

export interface IconProps extends Omit<LucideProps, "size" | "strokeWidth" | "ref"> {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
}

export function Icon({ icon: LucideIconComponent, size = "sm", className, ...rest }: IconProps) {
  const px = ICON_SIZES[size];
  return (
    <LucideIconComponent
      width={px}
      height={px}
      strokeWidth={ICON_STROKE_WIDTH}
      className={cn("shrink-0", className)}
      {...rest}
    />
  );
}
