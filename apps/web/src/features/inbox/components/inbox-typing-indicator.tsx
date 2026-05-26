"use client";

import { motion } from "motion/react";

export function InboxTypingIndicator() {
  const dotVariants = {
    animate: {
      y: [0, -4, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-start gap-1 py-1"
    >
      <div
        className="flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 bg-gray-900 border border-gray-800"
      >
        <span className="text-[11px] text-gray-400">
          escribiendo
        </span>
        <span className="flex items-center gap-1">
          <motion.span
            variants={dotVariants}
            animate="animate"
            transition={{ delay: 0 }}
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          <motion.span
            variants={dotVariants}
            animate="animate"
            transition={{ delay: 0.15 }}
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          <motion.span
            variants={dotVariants}
            animate="animate"
            transition={{ delay: 0.3 }}
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
        </span>
      </div>
    </motion.div>
  );
}
