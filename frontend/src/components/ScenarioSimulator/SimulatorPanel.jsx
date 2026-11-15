import React, { useState } from 'react';
import { PlayCircle, RefreshCw, AlertTriangle, ShieldAlert, Construction, Lock, Zap } from 'lucide-react';

export const SimulatorPanel = ({ onSimulate, onReset, replanComparison = null, isLoading = false }) => {
  const [activeScenario, setActiveScenario] = useState('');

  const handleTrigger = (type, payload = {}) => {
    setActiveScenario(type);
    if (onSimulate) {
      onSimulate({
        scenario_type: type,
        ...payload,
      });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-200 flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Dynamic Scenario Simulator</h3>
            <p className="text-xs text-slate-400">Trigger live events to test adaptive AI replanning</p>
          </div>
        </div>

        <button
          onClick={onReset}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Reset to default baseline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Reset Campus</span>
        </button>
      </div>

      {/* Preset Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {/* Scenario 1: Uni-Mall Crowd */}
        <button
          onClick={() =>
            handleTrigger('NEW_INCIDENT', {
              target_zone_id: 'Z04',
              incident_severity: 5,
              incident_category: 'CROWD_CONGESTION',
              incident_description: 'High student density & altercation at Uni-Mall food court.',
            })
          }
          className="p-2.5 text-left rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-red-500/50 transition group"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400 group-hover:scale-110 transition" />
            <span className="font-semibold text-xs text-white">Incident at Uni-Mall</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">Inject Severity 5 crowd alert in Zone Z04</p>
        </button>

        {/* Scenario 2: Hostel Breach */}
        <button
          onClick={() =>
            handleTrigger('NEW_INCIDENT', {
              target_zone_id: 'Z08',
              incident_severity: 4,
              incident_category: 'PERIMETER_ALERT',
              incident_description: 'Night curfew perimeter sensor trip at Boys Hostel 3.',
            })
          }
          className="p-2.5 text-left rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 transition group"
        >
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            <span className="font-semibold text-xs text-white">Hostel Breach Alert</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">Trigger night security intrusion in Zone Z08</p>
        </button>

        {/* Scenario 3: Path Closure */}
        <button
          onClick={() =>
            handleTrigger('PATH_CLOSURE', {
              target_edge_id: 'E10',
            })
          }
          className="p-2.5 text-left rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 transition group"
        >
          <div className="flex items-center gap-2 mb-1">
            <Construction className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
            <span className="font-semibold text-xs text-white">Close Walkway (E10)</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">Block corridor between Library & CSE Block</p>
        </button>

        {/* Scenario 4: Zone Lockdown */}
        <button
          onClick={() =>
            handleTrigger('ZONE_LOCKDOWN', {
              target_zone_id: 'Z11',
            })
          }
          className="p-2.5 text-left rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-purple-500/50 transition group"
        >
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
            <span className="font-semibold text-xs text-white">Lockdown Sports Area</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1">Restrict patrol entry to Indoor Stadium (Z11)</p>
        </button>
      </div>

      {/* Replanning Explanation Card */}
      {replanComparison && (
        <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between font-semibold text-blue-300">
            <span>Dynamic Replanning Rationale</span>
            <span className="text-[10px] font-mono text-slate-400">Trigger: {replanComparison.trigger_event}</span>
          </div>

          <p className="text-slate-300 text-[11px] leading-relaxed">
            {replanComparison.justification_narrative}
          </p>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-blue-900/60">
            <div className="text-emerald-400">
              Added: {replanComparison.added_zones?.length > 0 ? replanComparison.added_zones.join(', ') : 'None'}
            </div>
            <div className="text-red-400">
              Diverted: {replanComparison.removed_zones?.length > 0 ? replanComparison.removed_zones.join(', ') : 'None'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
