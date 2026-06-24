"use client";
import * as React from "react";
import { useMotionTemplate, useMotionValue, motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError, ...props }, ref) => {
    const radius = 100; // change this to increase the radius of the hover effect
    const [visible, setVisible] = React.useState(false);

    let mouseX = useMotionValue(0);
    let mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
      let { left, top } = currentTarget.getBoundingClientRect();

      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }
    return (
      <motion.div
        style={{
          background: useMotionTemplate`
            radial-gradient(
              ${visible ? radius + "px" : "0px"} circle at ${mouseX}px ${mouseY}px,
              ${hasError ? "rgba(239, 68, 68, 0.8)" : "var(--emerald-500)"},
              transparent 80%
            )
          `,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className={cn(
          "p-[2px] rounded-lg transition duration-300 group/input bg-gray-800/40 border border-gray-800",
          hasError ? "border-red-500/40" : "hover:border-gray-700 focus-within:border-transparent"
        )}
      >
        <input
          type={type}
          className={cn(
            `flex h-10 w-full border-none bg-gray-950/90 text-white shadow-input rounded-md px-3 py-2 text-sm file:border-0 file:bg-transparent 
            file:text-sm file:font-medium placeholder-gray-500 focus-visible:outline-none 
            disabled:cursor-not-allowed disabled:opacity-50
            group-hover/input:shadow-none transition duration-400
            `,
            className
          )}
          ref={ref}
          {...props}
        />
      </motion.div>
    );
  }
);
Input.displayName = "Input";

export { Input };
