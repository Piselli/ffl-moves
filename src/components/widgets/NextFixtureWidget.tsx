"use client";

import React, { useState, useEffect } from "react";
import { WidgetCard } from "@/components/WidgetCard";

export function NextFixtureWidget() {
  // Mock countdown timer for Gameweek 1
  const [timeLeft, setTimeLeft] = useState({
    days: 4,
    hours: 12,
    minutes: 30,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else {
          seconds = 59;
          if (minutes > 0) {
            minutes--;
          } else {
            minutes = 59;
            if (hours > 0) {
              hours--;
            } else {
              hours = 23;
              if (days > 0) {
                days--;
              }
            }
          }
        }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <WidgetCard 
      title="GW1 Deadline" 
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      featured={true}
      delay={0.1}
    >
      <div className="flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-4 mb-6">
          <TimeUnit value={timeLeft.days} label="Days" />
          <TimeSeparator />
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <TimeSeparator />
          <TimeUnit value={timeLeft.minutes} label="Mins" />
          <TimeSeparator />
          <TimeUnit value={timeLeft.seconds} label="Secs" />
        </div>
        
        <div className="w-full bg-white/5 rounded-xl p-4 flex items-center justify-between border border-white/10">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-fpl-cyan/20 flex items-center justify-center">
               <span className="font-display font-bold text-fpl-cyan">ARS</span>
             </div>
             <span className="text-muted-foreground text-sm font-bold">vs</span>
             <div className="w-10 h-10 rounded-full bg-fpl-purple/20 flex items-center justify-center">
               <span className="font-display font-bold text-fpl-purple">CHE</span>
             </div>
           </div>
           <div className="text-right">
             <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Opening Fixture</p>
             <p className="text-sm font-display text-white">Sunday 16:30</p>
           </div>
        </div>
      </div>
    </WidgetCard>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
         <span className="text-5xl font-display font-black text-white glow-cyan">{value.toString().padStart(2, '0')}</span>
      </div>
      <span className="text-xs font-bold text-muted-foreground uppercase mt-2 tracking-widest">{label}</span>
    </div>
  );
}

function TimeSeparator() {
  return (
    <div className="text-3xl font-display font-black text-white/20 pb-6 animate-pulse">:</div>
  );
}
