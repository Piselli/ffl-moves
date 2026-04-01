"use client";

import React from "react";
import { motion } from "framer-motion";

interface WidgetCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  featured?: boolean;
}

export function WidgetCard({ 
  title, 
  icon, 
  children, 
  className = "", 
  delay = 0,
  featured = false 
}: WidgetCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`relative glass-card rounded-3xl p-6 md:p-8 flex flex-col group overflow-hidden ${
        featured ? "border-fpl-cyan/30 shadow-[0_0_30px_rgba(0,196,106,0.1)]" : "border-white/10"
      } ${className}`}
    >
      {/* Background Hover Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${
        featured ? "from-fpl-cyan/5 to-transparent" : "from-white/5 to-transparent"
      } opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            featured ? "bg-fpl-cyan/10 text-fpl-cyan border border-fpl-cyan/20 glow-cyan" : "bg-white/5 text-muted-foreground border border-white/10"
          }`}>
            {icon}
          </div>
        )}
        <h3 className="text-xl font-display font-bold text-white uppercase tracking-wide">
          {title}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
