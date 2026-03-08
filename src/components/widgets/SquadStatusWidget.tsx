"use client";

import React from "react";
import { WidgetCard } from "@/components/WidgetCard";

export function SquadStatusWidget({ connected }: { connected: boolean }) {
  if (!connected) {
    return (
      <WidgetCard 
        title="Manager Status" 
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
        delay={0.2}
      >
        <div className="flex flex-col items-center justify-center h-48 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
             <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Connect your wallet to view squad status, points, and global rank.</p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard 
      title="Squad Status" 
      icon={
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      }
      delay={0.2}
    >
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Total Points */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden group hover:border-fpl-cyan/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-tr from-fpl-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Points</span>
          <span className="text-4xl font-display font-black text-white group-hover:text-glow-cyan transition-colors">842</span>
          <div className="flex items-center gap-1 mt-2 text-fpl-green">
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
             </svg>
             <span className="text-xs font-bold font-display">+45 GW Avg</span>
          </div>
        </div>

        {/* Global Rank */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden group hover:border-fpl-purple/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-tr from-fpl-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Global Rank</span>
          <span className="text-4xl font-display font-black text-white group-hover:text-glow-purple transition-colors">#14,204</span>
          <div className="flex items-center gap-1 mt-2 text-fpl-green">
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
             </svg>
             <span className="text-xs font-bold font-display">Up 2,100</span>
          </div>
        </div>

        {/* Team Value */}
        <div className="col-span-2 bg-gradient-to-r from-fpl-navy to-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-white/30 transition-colors">
           <div>
             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Team Value</span>
             <span className="text-2xl font-display font-black text-white">£102.4m</span>
           </div>
           <div className="text-right">
             <span className="text-xs font-bold text-muted-foreground block mb-1">In Bank</span>
             <span className="text-sm font-display font-bold text-fpl-cyan glow-cyan">£1.1m</span>
           </div>
        </div>
      </div>
    </WidgetCard>
  );
}
