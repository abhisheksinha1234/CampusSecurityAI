import React from 'react';
import { Shield, AlertTriangle, Activity, Footprints, Clock, CheckCircle2 } from 'lucide-react';

export const MetricCards = ({ zones = [], patrolPlan = null, incidents = [] }) => {
  const totalZones = zones.length;
  const criticalCount = zones.filter((z) => (z.risk_score || 0) >= 80.0).length;
  const highCount = zones.filter((z) => (z.risk_score || 0) >= 55.0 && (z.risk_score || 0) < 80.0).length;
  const activeIncidentsCount = incidents.filter((i) => i.status === 'ACTIVE' || i.status === 'INVESTIGATING').length;

  const coveragePct = patrolPlan?.priority_coverage_percentage ?? 0;
  const totalDuration = patrolPlan?.total_estimated_duration_minutes ?? 0;
  const totalDistance = patrolPlan?.total_distance_meters ?? 0;
  const status = patrolPlan?.status ?? 'PENDING_REVIEW';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total Zones */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Campus Zones</span>
          <Shield className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-white font-mono">{totalZones}</div>
        <span className="text-[10px] text-slate-500">LPU Verified Sectors</span>
      </div>

      {/* Critical & High Risk */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">High / Critical</span>
          <AlertTriangle className="w-4 h-4 text-orange-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-red-400 font-mono">{criticalCount}</span>
          <span className="text-xs text-slate-400 font-mono">/ {highCount} High</span>
        </div>
        <span className="text-[10px] text-slate-500">Dynamic Priority Targets</span>
      </div>

      {/* Active Incidents */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Live Incidents</span>
          <Activity className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold text-amber-400 font-mono">{activeIncidentsCount}</div>
        <span className="text-[10px] text-slate-500">Simulated / Active Feed</span>
      </div>

      {/* Planned Coverage */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Risk Coverage</span>
          <Footprints className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-emerald-400 font-mono">{coveragePct}%</div>
        <span className="text-[10px] text-slate-500">Priority Zone Visitation</span>
      </div>

      {/* Route Time & Dist */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Patrol Budget</span>
          <Clock className="w-4 h-4 text-sky-400" />
        </div>
        <div className="text-2xl font-bold text-sky-400 font-mono">{totalDuration.toFixed(1)}m</div>
        <span className="text-[10px] text-slate-500 font-mono">{totalDistance}m total dist</span>
      </div>

      {/* Approval Workflow State */}
      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Plan Status</span>
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
        </div>
        <div className="mt-1">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide font-mono inline-block ${
              status === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : status === 'REJECTED'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
            }`}
          >
            {status}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 block mt-1">Human-in-the-Loop</span>
      </div>
    </div>
  );
};
