import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CarFront } from "lucide-react";
import { Icon } from "@/components/ui/icon";

interface CarWashSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  text?: string;
}

export function CarWashSpinner({
  size = "md",
  showText = true,
  text = "Loading...",
  className,
  ...props
}: CarWashSpinnerProps) {
  const containerSize = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }[size];

  const iconSize = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  }[size];

  const ringBorder = {
    sm: "border-[3px]",
    md: "border-4",
    lg: "border-[5px]",
  }[size];

  return (
    <div
      className={cn("flex flex-col items-center gap-3", className)}
      {...props}
    >
      {/* Spinner container — fixed size, relative positioning anchor */}
      <div className={cn("relative flex items-center justify-center", containerSize)}>

        {/* Spinning ring — wrapper handles centering, inner div handles rotation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className={cn(
              "w-full h-full rounded-full border-t-transparent border-[#8c52ff]",
              ringBorder
            )}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          />
        </div>

        {/* Car icon — centered via flexbox, no competing transforms */}
        <Icon icon={CarFront} className={cn("relative z-10 text-[#8c52ff]", iconSize)} />
      </div>

      {showText && (
        <motion.p
          className="text-sm font-medium text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
