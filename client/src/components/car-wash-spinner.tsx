import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CarFront, Droplets } from "lucide-react";

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
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const containerSizeClasses = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  const dropletVariants = {
    initial: { opacity: 0, y: -5 },
    animate: { 
      opacity: [0, 1, 1, 0],
      y: [0, 5, 15, 30],
      transition: { 
        repeat: Infinity, 
        duration: 1.5,
        ease: "easeInOut",
      }
    }
  };

  const carVariants = {
    initial: { x: -50, opacity: 0 },
    animate: { 
      x: 0,
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 10,
        delay: 0.2,
      }
    }
  };

  const bubbleVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: (i: number) => ({
      scale: [0, 1, 1.2, 0],
      opacity: [0, 0.8, 1, 0],
      transition: {
        delay: i * 0.15,
        repeat: Infinity,
        duration: 2,
        ease: "easeInOut",
      }
    })
  };

  const waterWaveVariants = {
    initial: { scaleX: 1, scaleY: 0.3, y: 10, opacity: 0 },
    animate: { 
      scaleX: [1, 1.05, 1.1, 1.05, 1],
      scaleY: [0.3, 0.35, 0.4, 0.35, 0.3],
      y: [10, 8, 6, 8, 10],
      opacity: [0, 0.7, 1, 0.7, 0],
      transition: { 
        repeat: Infinity, 
        duration: 3,
        ease: "easeInOut",
      }
    }
  };

  // Choose between SVG or Icon implementation
  const useIconVersion = true;

  return (
    <div className={cn("flex flex-col items-center", containerSizeClasses[size], className)} {...props}>
      {useIconVersion ? (
        // Icon-based implementation
        <div className={cn("relative", sizeClasses[size])}>
          {/* Background circle */}
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-100/50 rounded-full"
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1],
              transition: { duration: 0.5 }
            }}
          />
          
          {/* Water Wave */}
          <motion.div 
            className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-4/5 h-1 bg-blue-400 opacity-70 rounded-full"
            variants={waterWaveVariants}
            initial="initial"
            animate="animate"
          />
          
          {/* Car Icon */}
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              transition: { 
                type: "spring", 
                stiffness: 260, 
                damping: 20,
                delay: 0.3 
              } 
            }}
          >
            <CarFront className="w-12 h-12 text-primary" />
          </motion.div>
          
          {/* Droplets Icon - Animated */}
          <motion.div 
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ 
              opacity: [0, 1, 0], 
              y: [-20, 0, 20],
              transition: { 
                repeat: Infinity, 
                duration: 2,
                repeatType: "loop" 
              } 
            }}
          >
            <Droplets className="w-8 h-8 text-blue-500" />
          </motion.div>
          
          {/* Bubbles */}
          <div className="absolute inset-0">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/80"
                style={{
                  width: Math.random() * 8 + 4,
                  height: Math.random() * 8 + 4,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1, 1.2, 0],
                  opacity: [0, 0.8, 1, 0],
                  transition: { 
                    delay: i * 0.4,
                    repeat: Infinity, 
                    duration: 2 + Math.random() * 2,
                    repeatDelay: Math.random() * 2,
                  } 
                }}
              />
            ))}
          </div>
          
          {/* Rotating Ring */}
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full border-4 border-t-transparent border-primary rounded-full"
            animate={{ 
              rotate: 360,
              transition: { 
                repeat: Infinity, 
                duration: 1.5,
                ease: "linear" 
              } 
            }}
          />
        </div>
      ) : (
        // SVG implementation
        <div className={cn("relative", sizeClasses[size])}>
          {/* Car Silhouette */}
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full"
            initial="initial"
            animate="animate"
            variants={carVariants}
          >
            <svg 
              viewBox="0 0 100 50" 
              className="w-full h-full text-primary fill-current"
            >
              <path d="M85,30 H70 L65,15 H30 L25,30 H15 C12,30 10,32 10,35 V40 H15 V38 C15,35 18,35 20,35 C22,35 25,35 25,38 V40 H75 V38 C75,35 78,35 80,35 C82,35 85,35 85,38 V40 H90 V35 C90,32 88,30 85,30 Z" />
              <circle cx="20" cy="38" r="5" fill="black" />
              <circle cx="80" cy="38" r="5" fill="black" />
            </svg>
          </motion.div>

          {/* Water Droplets */}
          <motion.div 
            className="absolute top-0 left-1/4 w-1 h-1 bg-blue-400 rounded-full"
            variants={dropletVariants}
            initial="initial"
            animate="animate"
            custom={0}
          />
          <motion.div 
            className="absolute top-0 left-1/3 w-1 h-1 bg-blue-400 rounded-full"
            variants={dropletVariants}
            initial="initial"
            animate="animate"
            custom={0.2}
          />
          <motion.div 
            className="absolute top-0 left-1/2 w-1 h-1 bg-blue-400 rounded-full"
            variants={dropletVariants}
            initial="initial"
            animate="animate"
            custom={0.4}
          />
          <motion.div 
            className="absolute top-0 left-2/3 w-1 h-1 bg-blue-400 rounded-full"
            variants={dropletVariants}
            initial="initial"
            animate="animate"
            custom={0.6}
          />
          <motion.div 
            className="absolute top-0 left-3/4 w-1 h-1 bg-blue-400 rounded-full"
            variants={dropletVariants}
            initial="initial"
            animate="animate"
            custom={0.8}
          />

          {/* Bubbles */}
          <motion.div 
            className="absolute top-1/4 left-1/5 w-2 h-2 bg-white opacity-70 rounded-full"
            variants={bubbleVariants}
            initial="initial"
            animate="animate"
            custom={0}
          />
          <motion.div 
            className="absolute top-1/3 left-2/5 w-3 h-3 bg-white opacity-70 rounded-full"
            variants={bubbleVariants}
            initial="initial"
            animate="animate"
            custom={1}
          />
          <motion.div 
            className="absolute top-1/4 left-3/5 w-2 h-2 bg-white opacity-70 rounded-full"
            variants={bubbleVariants}
            initial="initial"
            animate="animate"
            custom={2}
          />

          {/* Water Wave */}
          <motion.div 
            className="absolute bottom-0 left-0 right-0 h-2 bg-blue-500 opacity-50 rounded-full"
            variants={waterWaveVariants}
            initial="initial"
            animate="animate"
          />
        </div>
      )}
      
      {showText && (
        <motion.div 
          className="text-center font-medium text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {text}
        </motion.div>
      )}
    </div>
  );
}