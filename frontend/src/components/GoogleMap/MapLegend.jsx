import React from 'react';
import { ShieldAlert, Footprints, AlertTriangle } from 'lucide-react';

export const MapLegend = () => {
  return (
    <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 shadow-2xl text-xs text-slate-300 pointer-events-auto max-w-xs transition-all">
      <div className="flex items-center gap-1.5 font-semibold text-slate-100 mb-2 border-b border-slate-800 pb-1.5">
        <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
        <span>Campus Map Legend</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30"></span>
          <span>Low Risk (&lt;25)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/30"></span>
          <span>Medium (25-54)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-500/30"></span>
          <span>High Risk (55-79)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/30 animate-pulse"></span>
          <span>Critical (80-100)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 ring-2 ring-slate-500/30"></span>
          <span>Unknown / Gray</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
          <span>Restricted Zone</span>
        </div>
      </div>

      <div className="border-t border-slate-800/80 pt-1.5 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500 rounded"></div>
          <span className="text-[11px] text-slate-400">Verified AI Patrol Route</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t border-dashed border-red-500"></div>
          <span className="text-[11px] text-slate-400">Closed / Obstructed Walkway</span>
        </div>
      </div>
    </div>
  );
};
